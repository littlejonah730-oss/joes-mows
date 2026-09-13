import { useState } from "react";
import { useEntityCollection } from "@/hooks/useEntityCollection";
import { base44 } from "@/api/base44Client";
import { Image } from "@/components/ui/image";
import { formatDateShort } from "@/lib/lawnCare";
import { Camera, ImagePlus, X, Loader2 } from "lucide-react";

export default function FinishedProductTab({ employee, todayJobs }) {
  const { data: photos = [], createItem, deleteItem } = useEntityCollection("JobPhoto", { sort: "-created_date" });
  const [uploading, setUploading] = useState({});
  const [captions, setCaptions] = useState({});

  async function handleUpload(job, file) {
    if (!file || !employee) return;
    setUploading((p) => ({ ...p, [job.id]: true }));
    try {
      const res = await base44.integrations.Core.UploadFile({ file });
      await createItem({
        job_id: job.id,
        customer_name: job.customer_name,
        employee_id: employee.id,
        employee_name: employee.name,
        image_url: res.file_url,
        scheduled_date: job.scheduled_date,
        caption: captions[job.id] || "",
      });
      setCaptions((p) => ({ ...p, [job.id]: "" }));
    } catch (e) {
      console.error("Upload failed", e);
      alert("Upload failed. Please try again.");
    } finally {
      setUploading((p) => ({ ...p, [job.id]: false }));
    }
  }

  return (
    <div className="p-4">
      <h1 className="text-lg font-bold mb-1 flex items-center gap-2">
        <Camera className="w-5 h-5 text-primary" /> Finished Product
      </h1>
      <p className="text-xs text-muted-foreground mb-4">
        Snap how each yard looks when you're done. Today's jobs only.
      </p>

      {todayJobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Camera className="w-12 h-12 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">No jobs scheduled today.</p>
          <p className="text-xs text-muted-foreground mt-1">Claim a job to start tracking finished work.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {todayJobs.map((job) => {
            const jobPhotos = photos.filter((p) => p.job_id === job.id);
            return (
              <div key={job.id} className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold">{job.customer_name}</p>
                    <p className="text-[10px] text-muted-foreground">{formatDateShort(job.scheduled_date)}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {jobPhotos.length} photo{jobPhotos.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {jobPhotos.length > 0 && (
                  <div className="grid grid-cols-3 gap-1.5 mb-2">
                    {jobPhotos.map((p) => (
                      <div key={p.id} className="relative">
                        <Image src={p.image_url} className="w-full h-20 rounded-lg" fittingType="fill" />
                        <button
                          onClick={() => deleteItem(p.id)}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        {p.caption && (
                          <p className="text-[9px] text-muted-foreground truncate mt-0.5">{p.caption}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <input
                  value={captions[job.id] || ""}
                  onChange={(e) => setCaptions((p) => ({ ...p, [job.id]: e.target.value }))}
                  placeholder="Caption (optional)"
                  className="w-full h-8 rounded-md border border-input bg-transparent px-2 text-xs mb-2"
                />
                <label
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 border-dashed cursor-pointer text-xs font-medium transition-colors ${
                    uploading[job.id] ? "border-primary/50 text-primary" : "border-border hover:border-primary/50 text-muted-foreground"
                  }`}
                >
                  {uploading[job.id] ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Uploading...
                    </>
                  ) : (
                    <>
                      <ImagePlus className="w-4 h-4" /> Add Photo
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUpload(job, f);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}