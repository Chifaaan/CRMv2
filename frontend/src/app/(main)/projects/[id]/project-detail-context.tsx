"use client";

import { createContext, useContext } from "react";
import type { ProjectDetailPayload } from "./project-detail-types";

type Ctx = {
  project: ProjectDetailPayload;
  userRole: string;
};

const ProjectDetailContext = createContext<Ctx | null>(null);

export function ProjectDetailProvider({
  project,
  userRole,
  children,
}: {
  project: ProjectDetailPayload;
  userRole: string;
  children: React.ReactNode;
}) {
  return (
    <ProjectDetailContext.Provider value={{ project, userRole }}>
      {children}
    </ProjectDetailContext.Provider>
  );
}

export function useProjectDetail() {
  const v = useContext(ProjectDetailContext);
  if (!v) {
    throw new Error("useProjectDetail must be used inside ProjectDetailProvider");
  }
  return v;
}
