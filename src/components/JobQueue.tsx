import { useJobQueue } from "../contexts/JobQueueContext";
import type { FinanceJob, FinanceJobKind } from "../types";
import { createPortal } from "react-dom";

interface JobQueueProps {
  jobs: FinanceJob[];
  kind: FinanceJobKind;
  onApply: (job: FinanceJob) => void;
}

const statusLabel: Record<FinanceJob["status"], string> = {
  queued: "Queued",
  running: "Running",
  completed: "Completed",
  failed: "Failed"
};

export function JobQueueButton() {
  const { jobs, isJobQueueOpen, setIsJobQueueOpen } = useJobQueue();
  const activeJobs = jobs.filter((job) => job.status === "queued" || job.status === "running");

  return (
    <button className="topbar-jobs-button" type="button" onClick={() => setIsJobQueueOpen(!isJobQueueOpen)} aria-expanded={isJobQueueOpen}>
      {isJobQueueOpen ? "Hide jobs" : "Show jobs"}{activeJobs.length ? ` (${activeJobs.length})` : ""}
    </button>
  );
}

export function JobQueue({ jobs, kind, onApply }: JobQueueProps) {
  const { isJobQueueOpen, setIsJobQueueOpen } = useJobQueue();
  const pageJobs = jobs.filter((job) => job.kind === kind);

  if (!isJobQueueOpen) return null;

  return createPortal(
    <div className="job-queue-overlay" role="presentation" onMouseDown={() => setIsJobQueueOpen(false)}>
      <section className="job-queue" role="dialog" aria-modal="true" aria-labelledby={`${kind}JobQueueTitle`} onMouseDown={(event) => event.stopPropagation()}>
        <button className="job-queue__toggle" type="button" onClick={() => setIsJobQueueOpen(false)}>Hide jobs</button>
        <div className="job-queue__list">
          <div className="job-queue__heading">
            <p className="eyebrow" id={`${kind}JobQueueTitle`}>Save jobs</p>
            <p>Jobs exist only while this tab remains open.</p>
          </div>
          {pageJobs.length ? pageJobs.map((job) => {
            const transactionCount = Array.isArray(job.data) ? job.data.length : 1;
            return (
              <button key={job.id} className="job-queue__item" type="button" onClick={() => { onApply(job); setIsJobQueueOpen(false); }}>
                <span className="job-queue__item-main">
                  <strong>{transactionCount} transaction{transactionCount === 1 ? "" : "s"}</strong>
                  <small>{new Date(job.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</small>
                </span>
                <span className={`job-queue__status is-${job.status}`}>{statusLabel[job.status]}</span>
                {job.error ? <small className="job-queue__error">{job.error}</small> : null}
              </button>
            );
          }) : <p className="job-queue__empty">No save jobs yet.</p>}
        </div>
      </section>
    </div>,
    document.body
  );
}
