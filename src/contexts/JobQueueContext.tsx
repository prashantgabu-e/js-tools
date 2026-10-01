import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { PropsWithChildren } from "react";
import { submitFinancePayload } from "../utils/finance";
import type { FinanceJob, FinancePayload } from "../types";

const FINANCE_IFRAME_NAME = "financeSubmitFrame";

interface JobQueueContextValue {
  jobs: FinanceJob[];
  isJobQueueOpen: boolean;
  setIsJobQueueOpen: (isOpen: boolean) => void;
  queueSingle: (transaction: FinancePayload) => void;
  queueBulk: (transactions: FinancePayload[]) => void;
}

const JobQueueContext = createContext<JobQueueContextValue | null>(null);

export function JobQueueProvider({ children }: PropsWithChildren) {
  const [jobs, setJobs] = useState<FinanceJob[]>([]);
  const [isJobQueueOpen, setIsJobQueueOpen] = useState(false);

  function addJob(kind: FinanceJob["kind"], data: FinanceJob["data"]) {
    setJobs((current) => [
      ...current,
      { id: crypto.randomUUID(), kind, data, status: "queued", createdAt: new Date().toISOString() }
    ]);
  }

  useEffect(() => {
    const nextJob = jobs.find((job) => job.status === "queued");
    if (!nextJob || jobs.some((job) => job.status === "running")) return;

    setJobs((current) => current.map((job) => (job.id === nextJob.id ? { ...job, status: "running" } : job)));

    const payload = Array.isArray(nextJob.data)
      ? { operation: "bulk-add", transactions: JSON.stringify(nextJob.data) }
      : nextJob.data;

    void submitFinancePayload(payload, FINANCE_IFRAME_NAME)
      .then((response) => {
        if (!response?.success) throw new Error(response?.message || "Unable to save transaction.");
        setJobs((current) => current.map((job) => (job.id === nextJob.id ? { ...job, status: "completed" } : job)));
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : "Unable to save transaction.";
        setJobs((current) => current.map((job) => (job.id === nextJob.id ? { ...job, status: "failed", error: message } : job)));
      });
  }, [jobs]);

  const value = useMemo<JobQueueContextValue>(
    () => ({ jobs, isJobQueueOpen, setIsJobQueueOpen, queueSingle: (transaction) => addJob("single", transaction), queueBulk: (transactions) => addJob("bulk", transactions) }),
    [isJobQueueOpen, jobs]
  );

  return <JobQueueContext.Provider value={value}>{children}</JobQueueContext.Provider>;
}

export function useJobQueue() {
  const context = useContext(JobQueueContext);
  if (!context) throw new Error("useJobQueue must be used inside JobQueueProvider.");
  return context;
}
