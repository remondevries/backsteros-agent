import { useEffect, useRef, useState } from "react";
import { XTermView } from "../../editor/XTermView";
import {
  getActiveLinearIssueDispatchJobs,
  injectDispatchCommandForJob,
  subscribeLinearIssueDispatchJobs,
  type LinearIssueDispatchJob,
} from "../../lib/linearIssueAgentDispatch";
import { ensureLinearIssueTerminalDirectory, getSettings } from "../../lib/api";
import { isTauriRuntime } from "../../lib/tauriRuntime";

function DispatchIssueTerminal({ job }: { job: LinearIssueDispatchJob }) {
  const [workingDirectory, setWorkingDirectory] = useState<string | null>(null);
  const injectedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    void getSettings()
      .then((settings) => {
        if (cancelled) return;
        const projectsPath = settings.projectsPath?.trim();
        if (!projectsPath) {
          setWorkingDirectory(null);
          return;
        }

        void ensureLinearIssueTerminalDirectory({
          projectsPath,
          projectName: job.projectName,
          issueIdentifier: job.identifier,
        })
          .then((result) => {
            if (!cancelled) setWorkingDirectory(result.path);
          })
          .catch(() => {
            if (!cancelled) setWorkingDirectory(projectsPath);
          });
      })
      .catch(() => {
        if (!cancelled) setWorkingDirectory(null);
      });

    return () => {
      cancelled = true;
    };
  }, [job.identifier, job.projectName]);

  useEffect(() => {
    if (!workingDirectory || injectedRef.current) return;
    injectedRef.current = true;
    void injectDispatchCommandForJob(job);
  }, [job, workingDirectory]);

  if (!workingDirectory) return null;

  return (
    <XTermView
      className="linear-issue-agent-dispatch-terminal"
      workingDirectory={workingDirectory}
      sessionKey={job.issueId}
    />
  );
}

/**
 * Keeps hidden issue terminals attached so auto-dispatched agents can run in
 * xterm sessions without requiring the issue view to stay open.
 */
export function LinearIssueAgentDispatchHost() {
  const [jobs, setJobs] = useState<LinearIssueDispatchJob[]>(() =>
    getActiveLinearIssueDispatchJobs(),
  );

  useEffect(() => {
    return subscribeLinearIssueDispatchJobs(setJobs);
  }, []);

  if (!isTauriRuntime() || jobs.length === 0) {
    return null;
  }

  return (
    <div
      className="linear-issue-agent-dispatch-host"
      aria-hidden="true"
      data-testid="linear-issue-agent-dispatch-host"
    >
      {jobs.map((job) => (
        <DispatchIssueTerminal key={job.dispatchKey} job={job} />
      ))}
    </div>
  );
}
