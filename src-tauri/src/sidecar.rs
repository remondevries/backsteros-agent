use serde::Serialize;
use std::fs;
use std::net::{SocketAddr, TcpStream};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::path::BaseDirectory;
use tauri::{AppHandle, Manager};

pub const DEFAULT_PORT: u16 = 3847;
const DEFAULT_TOKEN: &str = "dev-token-change-me";
const STARTUP_TIMEOUT: Duration = Duration::from_secs(20);

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SidecarConnection {
    pub base_url: String,
    pub token: String,
}

pub struct SidecarState {
    port: u16,
    token: String,
    child: Mutex<Option<Child>>,
}

fn env_file_path() -> PathBuf {
    dirs::home_dir()
        .unwrap_or_default()
        .join(".backsteros-agent")
        .join(".env")
}

fn read_env_value(key: &str) -> Option<String> {
    let content = fs::read_to_string(env_file_path()).ok()?;
    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with('#') {
            continue;
        }
        let Some((name, value)) = trimmed.split_once('=') else {
            continue;
        };
        if name.trim() == key {
            return Some(value.trim().to_string());
        }
    }
    None
}

impl SidecarState {
    pub fn new() -> Self {
        let token = std::env::var("SIDECAR_TOKEN")
            .ok()
            .or_else(|| read_env_value("SIDECAR_TOKEN"))
            .unwrap_or_else(|| DEFAULT_TOKEN.to_string());

        Self {
            port: DEFAULT_PORT,
            token,
            child: Mutex::new(None),
        }
    }

    pub fn connection(&self) -> SidecarConnection {
        SidecarConnection {
            base_url: format!("http://127.0.0.1:{}", self.port),
            token: self.token.clone(),
        }
    }
}

fn find_bun_executable() -> Option<PathBuf> {
    if let Ok(path) = std::env::var("BUN_INSTALL") {
        let candidate = PathBuf::from(path).join("bin/bun");
        if candidate.exists() {
            return Some(candidate);
        }
    }

    if let Some(home) = dirs::home_dir() {
        let candidates = [
            home.join(".bun/bin/bun"),
            home.join(".local/bin/bun"),
        ];
        for candidate in candidates {
            if candidate.exists() {
                return Some(candidate);
            }
        }
    }

    for candidate in ["/opt/homebrew/bin/bun", "/usr/local/bin/bun"] {
        let path = PathBuf::from(candidate);
        if path.exists() {
            return Some(path);
        }
    }

    Command::new("which")
        .arg("bun")
        .output()
        .ok()
        .and_then(|output| {
            if !output.status.success() {
                return None;
            }
            let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if path.is_empty() {
                None
            } else {
                Some(PathBuf::from(path))
            }
        })
}

fn wait_for_port(port: u16) -> bool {
    let addr = SocketAddr::from(([127, 0, 0, 1], port));
    let deadline = Instant::now() + STARTUP_TIMEOUT;

    while Instant::now() < deadline {
        if TcpStream::connect_timeout(&addr, Duration::from_millis(200)).is_ok() {
            return true;
        }
        std::thread::sleep(Duration::from_millis(200));
    }

    false
}

fn apply_env_from_file(command: &mut Command) {
    let Ok(content) = fs::read_to_string(env_file_path()) else {
        return;
    };

    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with('#') {
            continue;
        }
        let Some((name, value)) = trimmed.split_once('=') else {
            continue;
        };
        command.env(name.trim(), value.trim());
    }
}

fn spawn_sidecar_process(sidecar_dir: &Path, token: &str, port: u16) -> Result<Child, String> {
    let bun = find_bun_executable().ok_or_else(|| {
        "Bun is not installed. Install it from https://bun.sh and restart BacksterOS Agent.".to_string()
    })?;

    let mut command = Command::new(bun);
    command
        .arg("run")
        .arg("src/server.ts")
        .current_dir(sidecar_dir)
        .env("SIDECAR_TOKEN", token)
        .env("SIDECAR_PORT", port.to_string())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    apply_env_from_file(&mut command);

    if let Some(home) = dirs::home_dir() {
        let path = format!(
            "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:{}",
            home.join(".bun/bin").display()
        );
        command.env("PATH", path);
    }

    command.spawn().map_err(|error| {
        format!("Failed to start agent server with Bun: {error}")
    })
}

pub fn start_sidecar(app: &AppHandle) -> tauri::Result<()> {
    if cfg!(debug_assertions) {
        log::info!("Dev mode: expecting sidecar from beforeDevCommand on port {}", DEFAULT_PORT);
        return Ok(());
    }

    restart_sidecar(app).map_err(|error| {
        tauri::Error::Io(std::io::Error::new(std::io::ErrorKind::Other, error))
    })
}

pub fn restart_sidecar(app: &AppHandle) -> Result<(), String> {
    if cfg!(debug_assertions) {
        return Ok(());
    }

    let state = app.state::<SidecarState>();
    if let Some(mut child) = state.child.lock().expect("sidecar child lock").take() {
        let _ = child.kill();
        let _ = child.wait();
    }

    let sidecar_dir = app
        .path()
        .resolve("resources/sidecar", BaseDirectory::Resource)
        .map_err(|error| format!("Missing bundled sidecar resources: {error}"))?;

    let mut child = spawn_sidecar_process(&sidecar_dir, &state.token, state.port)?;

    if !wait_for_port(state.port) {
        let _ = child.kill();
        return Err(
            "Agent server did not restart in time. Install Bun from https://bun.sh and restart."
                .to_string(),
        );
    }

    *state.child.lock().expect("sidecar child lock") = Some(child);
    log::info!("Sidecar restarted at http://127.0.0.1:{}", state.port);
    Ok(())
}
