import { ProjectIcon } from "../ui/icons/ProjectIcon";

/** Icon for a Linear project name or project-scoped UI. */
export function LinearProjectIcon({ title }: { title?: string }) {
  return <ProjectIcon className="linear-project-icon" size={14} title={title} />;
}
