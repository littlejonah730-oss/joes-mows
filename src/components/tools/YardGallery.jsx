import { useState } from "react";
import { useEntityCollection } from "@/hooks/useEntityCollection";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Image } from "@/components/ui/image";
import { Plus, Trash2, Upload, Loader2, ImageIcon, X } from "lucide-react";

const CATEGORIES = ["Before/After", "Best Work", "Seasonal Jobs", "Other"];

export default function YardGallery({ customers = [] }) {
  const { data: photos = [], createItem, deleteItem } = useEntityCollection("YardPhoto");
  const [showForm, setShowForm] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");
  const [fullscreenPhoto, setFullscreenPhoto] = useState(null);

  const handleSave = (data) => {
    createItem(data);
    setShowForm(false);
  };

  const filtered = activeCategory === "All" ? photos : photos.filter((p) => p.category === activeCategory);

  return (
    <div>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setActiveCategory("All")} className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${activeCategory === "All" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>All</button>
          {CATEGORIES.map((cat) => (
            <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${activeCategory === cat ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>{cat}</button>
          ))}
        </div>
        <Button onClick={() => setShowForm(true)} size="sm" className="bg-primary text-black hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-1" /> Upload Photo
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <ImageIcon className="w-10 h-10 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No photos yet. Upload your best work!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((photo) => (
            <div key={photo.id} className="rounded-xl border border-border bg-card overflow-hidden group relative cursor-pointer" onClick={() => setFullscreenPhoto(photo)}>
              <div className="aspect-square">
                <Image src={photo.image_url} alt={photo.title} fittingType="fill" className="w-full h-full" />
              </div>
              <div className="p-2">
                <p className="text-xs font-medium truncate">{photo.title}</p>
                <span className="text-[9px] text-primary bg-primary/10 px-1.5 py-0.5 rounded">{photo.category}</span>
                {photo.customer_name && <p className="text-[10px] text-muted-foreground truncate mt-0.5">{photo.customer_name}</p>}
              </div>
              <button onClick={(e) => { e.stopPropagation(); deleteItem(photo.id); }} className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <Dialog open onOpenChange={(o) => !o && setShowForm(false)}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Upload Yard Photo</DialogTitle></DialogHeader>
            <PhotoForm customers={customers} onSubmit={handleSave} onCancel={() => setShowForm(false)} />
          </DialogContent>
        </Dialog>
      )}

      {fullscreenPhoto && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4" onClick={() => setFullscreenPhoto(null)}>
          <button className="absolute top-4 right-4 text-white/80 hover:text-white p-2 z-10" onClick={() => setFullscreenPhoto(null)}>
            <X className="w-6 h-6" />
          </button>
          <div className="max-w-5xl max-h-full" onClick={(e) => e.stopPropagation()}>
            <img src={fullscreenPhoto.image_url} alt={fullscreenPhoto.title} className="max-w-full max-h-[80vh] object-contain rounded-lg" />
            <div className="text-center mt-3">
              <p className="text-sm font-medium text-white">{fullscreenPhoto.title}</p>
              <p className="text-xs text-white/60">{fullscreenPhoto.category}{fullscreenPhoto.customer_name ? ` · ${fullscreenPhoto.customer_name}` : ""}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PhotoForm({ customers, onSubmit, onCancel }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Best Work");
  const [customerId, setCustomerId] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setImageUrl(file_url);
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim() || !imageUrl) return;
    const cust = customers.find((c) => c.id === customerId);
    onSubmit({
      title: title.trim(),
      image_url: imageUrl,
      category,
      customer_id: customerId || undefined,
      customer_name: cust?.name,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <Label className="text-xs mb-1.5 block">Title</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Front yard makeover" autoFocus />
      </div>
      <div>
        <Label className="text-xs mb-1.5 block">Category</Label>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm">
          {CATEGORIES.map((cat) => (<option key={cat} value={cat}>{cat}</option>))}
        </select>
      </div>
      <div>
        <Label className="text-xs mb-1.5 block">Customer (optional)</Label>
        <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm">
          <option value="">None</option>
          {customers.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
        </select>
      </div>
      <div>
        <Label className="text-xs mb-1.5 block">Photo</Label>
        {imageUrl ? (
          <div className="relative">
            <img src={imageUrl} alt="Preview" className="w-full h-40 object-cover rounded-lg" />
            <button type="button" onClick={() => setImageUrl("")} className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors">
            {uploading ? (
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            ) : (
              <>
                <Upload className="w-6 h-6 text-muted-foreground mb-1" />
                <span className="text-xs text-muted-foreground">Tap to upload</span>
              </>
            )}
            <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
          </label>
        )}
      </div>
      <div className="flex gap-2 pt-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="flex-1 bg-primary text-black hover:bg-primary/90" disabled={!imageUrl || uploading}>Save</Button>
      </div>
    </form>
  );
}