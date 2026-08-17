"use client";

import { upload } from "@vercel/blob/client";
import Image from "next/image";
import { useState } from "react";
import { CheckCircle, Eye, EyeSlash, FileArrowUp, Sparkle } from "@phosphor-icons/react";

type StudentOption = { id: string; name: string; group: string };
type PraisePost = {
  id: string;
  title: string;
  body: string;
  visibility: "class" | "related_guardians" | "teacher_only";
  studentNames: string;
  createdAt: Date | string;
  media: Array<{ id: string; mimeType: string }>;
};

const allowedMediaTypes = ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm"];
const maxMediaBytes = 50 * 1024 * 1024;
const maxImageDimension = 1600;

async function optimizeImageFile(file: File) {
  if (!file.type.startsWith("image/") || typeof createImageBitmap !== "function") {
    return file;
  }

  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxImageDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    if (scale === 1 && file.type === "image/webp") return file;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, width, height);
    const optimizedBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.82));
    if (!optimizedBlob || optimizedBlob.size >= file.size) return file;
    const baseName = file.name.replace(/\.[^/.]+$/, "") || "praise-media";
    return new File([optimizedBlob], `${baseName}.webp`, { type: "image/webp", lastModified: Date.now() });
  } catch {
    return file;
  } finally {
    bitmap?.close();
  }
}

export function TeacherPraisePanel({ classId, students, initialPosts }: { classId: string; students: StudentOption[]; initialPosts: PraisePost[] }) {
  const [posts, setPosts] = useState(initialPosts);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<PraisePost["visibility"]>("related_guardians");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function toggleStudent(id: string) {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  async function selectMedia(file: File | undefined) {
    if (!file) {
      setMediaFile(null);
      return;
    }
    if (!allowedMediaTypes.includes(file.type) || file.size <= 0 || file.size > maxMediaBytes) {
      setMediaFile(null);
      setMessage("Chỉ hỗ trợ ảnh/video hợp lệ và file không quá 50 MB.");
      return;
    }
    setIsOptimizing(file.type.startsWith("image/"));
    const optimizedFile = await optimizeImageFile(file);
    setIsOptimizing(false);
    setMessage(optimizedFile !== file ? "Ảnh đã được giảm kích thước trước khi upload." : null);
    setMediaFile(optimizedFile);
  }

  async function createPost() {
    if (!title.trim() || !body.trim() || selectedIds.length === 0) {
      setMessage("Chọn ít nhất một học sinh và nhập tiêu đề/nội dung.");
      return;
    }
    setBusy(true);
    setMessage(null);
    setUploadProgress(null);
    let createdPostId: string | null = null;
    try {
      const response = await fetch("/api/teacher/praise", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ classId, studentIds: selectedIds, title, body, visibility }),
      });
      const payload = await response.json().catch(() => null) as { error?: string; data?: { id?: string } } | null;
      if (!response.ok || !payload?.data?.id) throw new Error(payload?.error || "Không thể đăng bài.");
      createdPostId = payload.data.id;

      if (mediaFile) {
        await upload(mediaFile.name, mediaFile, {
          access: "private",
          handleUploadUrl: `/api/teacher/praise/${payload.data.id}/media`,
          clientPayload: JSON.stringify({ classId, postId: payload.data.id }),
          multipart: mediaFile.size > 4 * 1024 * 1024,
          onUploadProgress: (progress) => setUploadProgress(Math.round(progress.percentage)),
        });
      }

      setTitle("");
      setBody("");
      setSelectedIds([]);
      setMediaFile(null);
      setUploadProgress(null);
      setMessage(mediaFile ? "Đã đăng bài và upload media riêng tư." : "Đã đăng bài tuyên dương.");
      window.location.reload();
    } catch (error) {
      if (createdPostId) {
        const postId = createdPostId;
        const createdStudentNames = students.filter((student) => selectedIds.includes(student.id)).map((student) => student.name).join(", ") || "Lớp học";
        setPosts((current) => [{ id: postId, title: title.trim(), body: body.trim(), visibility, studentNames: createdStudentNames, createdAt: new Date().toISOString(), media: [] }, ...current]);
        setTitle("");
        setBody("");
        setSelectedIds([]);
        setMediaFile(null);
        setUploadProgress(null);
        setMessage("Bài tuyên dương đã được tạo nhưng media chưa upload. Không cần bấm đăng lại để tránh tạo bài trùng.");
        return;
      }
      setMessage(error instanceof Error ? error.message : "Không thể đăng bài.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleVisibility(post: PraisePost) {
    const next = post.visibility === "teacher_only" ? "related_guardians" : "teacher_only";
    setBusy(true);
    try {
      const response = await fetch(`/api/teacher/praise/${post.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ visibility: next }),
      });
      if (!response.ok) throw new Error("Không thể cập nhật trạng thái bài.");
      setPosts((current) => current.map((item) => item.id === post.id ? { ...item, visibility: next } : item));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể cập nhật bài.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
      <section className="rounded-[1.5rem] bg-[var(--surface-lowest)] p-5 soft-shadow">
        <div className="flex items-center gap-2"><Sparkle size={24} className="text-[var(--secondary)]" weight="fill" /><h2 className="font-heading text-xl font-bold text-[var(--on-surface)]">Tạo bài tuyên dương</h2></div>
        <p className="mt-2 font-body text-sm leading-6 text-[var(--on-surface-variant)]">Chọn học sinh, viết lời khen và chọn người được xem.</p>
        <fieldset className="mt-5">
          <legend className="font-heading text-sm font-bold text-[var(--on-surface)]">Học sinh được tuyên dương</legend>
          <div className="mt-3 grid max-h-48 gap-2 overflow-y-auto">
            {students.map((student) => <label key={student.id} className={`flex cursor-pointer items-center gap-3 rounded-xl p-3 ${selectedIds.includes(student.id) ? "bg-[var(--primary-fixed)]" : "bg-[var(--surface-low)]"}`}><input type="checkbox" checked={selectedIds.includes(student.id)} onChange={() => toggleStudent(student.id)} className="h-4 w-4 accent-[var(--primary)]" /><span className="min-w-0"><span className="block truncate font-heading text-sm font-bold text-[var(--on-surface)]">{student.name}</span><span className="block font-body text-xs text-[var(--on-surface-variant)]">{student.group}</span></span></label>)}
          </div>
        </fieldset>
        <label className="mt-4 block"><span className="font-heading text-sm font-bold text-[var(--on-surface)]">Tiêu đề</span><input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={200} className="mt-2 min-h-11 w-full rounded-xl border-2 border-transparent bg-[var(--surface-low)] px-4 font-body outline-none focus:border-[var(--primary-fixed)]" placeholder="Ví dụ: Một nỗ lực rất đáng khen" /></label>
        <label className="mt-4 block"><span className="font-heading text-sm font-bold text-[var(--on-surface)]">Lời khen</span><textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={10000} rows={4} className="mt-2 w-full rounded-xl border-2 border-transparent bg-[var(--surface-low)] px-4 py-3 font-body outline-none focus:border-[var(--primary-fixed)]" placeholder="Viết điều tích cực con đã làm..." /></label>
        <label className="mt-4 block"><span className="font-heading text-sm font-bold text-[var(--on-surface)]">Hiển thị</span><select value={visibility} onChange={(event) => setVisibility(event.target.value as PraisePost["visibility"])} className="mt-2 min-h-11 w-full rounded-xl bg-[var(--surface-low)] px-4 font-body"><option value="related_guardians">Học sinh liên quan và phụ huynh</option><option value="class">Cả lớp và phụ huynh</option><option value="teacher_only">Chỉ giáo viên (bản nháp)</option></select></label>
        <label className="mt-4 block"><span className="font-heading text-sm font-bold text-[var(--on-surface)]">Ảnh/video đính kèm <span className="font-body text-xs font-normal text-[var(--on-surface-variant)]">(tuỳ chọn, tối đa 50 MB)</span></span><span className="mt-2 flex min-h-12 items-center gap-2 rounded-xl bg-[var(--surface-low)] px-4 font-body text-sm text-[var(--on-surface-variant)]"><FileArrowUp size={20} /><input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" onChange={(event) => void selectMedia(event.target.files?.[0])} className="min-w-0 flex-1" /></span>{isOptimizing ? <span className="mt-2 block font-body text-xs text-[var(--primary)]">Đang tối ưu ảnh...</span> : null}{mediaFile ? <span className="mt-2 block truncate font-body text-xs text-[var(--on-surface-variant)]">Đã chọn: {mediaFile.name}</span> : null}</label>
        <button type="button" disabled={busy || isOptimizing} onClick={() => void createPost()} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-5 font-heading text-sm font-bold text-white disabled:opacity-50"><CheckCircle size={19} weight="fill" /> {busy ? uploadProgress !== null ? `Đang upload ${uploadProgress}%...` : "Đang lưu..." : isOptimizing ? "Đang tối ưu ảnh..." : "Đăng tuyên dương"}</button>
        {message ? <p role="status" className="mt-3 font-body text-sm text-[var(--on-surface-variant)]">{message}</p> : null}
      </section>
      <section>
        <div className="mb-4 flex items-center justify-between"><h2 className="font-heading text-2xl font-bold text-[var(--on-surface)]">Bài đã tạo</h2><span className="rounded-full bg-[var(--surface-low)] px-3 py-1 font-heading text-xs font-bold text-[var(--primary)]">{posts.length} bài</span></div>
        <div className="space-y-4">
          {posts.map((post) => <article key={post.id} className="rounded-[1.5rem] bg-[var(--surface-lowest)] p-5 soft-shadow"><div className="flex items-start justify-between gap-4"><div><h3 className="font-heading text-lg font-bold text-[var(--on-surface)]">{post.title}</h3><p className="mt-1 font-body text-xs text-[var(--on-surface-variant)]">{post.studentNames} · {new Date(post.createdAt).toLocaleDateString("vi-VN")}</p></div><button type="button" disabled={busy} onClick={() => void toggleVisibility(post)} aria-label={post.visibility === "teacher_only" ? "Đăng bài tuyên dương" : "Ẩn bài tuyên dương"} className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-low)] text-[var(--primary)] disabled:opacity-50">{post.visibility === "teacher_only" ? <Eye size={19} /> : <EyeSlash size={19} />}</button></div><p className="mt-4 font-body text-sm leading-7 text-[var(--on-surface-variant)]">{post.body}</p>{post.media?.length ? <div className="mt-4 grid gap-3 sm:grid-cols-2">{post.media.map((media) => media.mimeType.startsWith("video/") ? <video key={media.id} controls preload="metadata" className="max-h-72 w-full rounded-2xl bg-black" src={`/api/media/${media.id}`} /> : <Image key={media.id} src={`/api/media/${media.id}`} alt={`Media của bài ${post.title}`} width={800} height={600} unoptimized className="max-h-72 w-full rounded-2xl object-cover" />)}</div> : null}<span className="mt-4 inline-flex rounded-full bg-[var(--surface-low)] px-3 py-1 font-heading text-[11px] font-bold text-[var(--on-surface-variant)]">{post.visibility === "teacher_only" ? "Bản nháp" : post.visibility === "class" ? "Cả lớp" : "Phụ huynh liên quan"}</span></article>)}
          {posts.length === 0 ? <div className="rounded-[1.5rem] border border-dashed border-[var(--outline-variant)] bg-[var(--surface-lowest)] p-12 text-center"><Sparkle size={36} className="mx-auto text-[var(--outline)]" /><p className="mt-3 font-body text-sm text-[var(--on-surface-variant)]">Chưa có bài tuyên dương nào.</p></div> : null}
        </div>
      </section>
    </div>
  );
}
