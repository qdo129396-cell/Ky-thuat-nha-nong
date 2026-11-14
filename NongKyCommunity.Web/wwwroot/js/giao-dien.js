document.addEventListener("click", event => {
  const button = event.target.closest(".toggle-password");
  if (!button) return;
  const input = button.parentElement.querySelector("input");
  const show = input.type === "password";
  input.type = show ? "text" : "password";
  button.textContent = show ? "🙈" : "👁";
  button.setAttribute("aria-label", show ? "Ẩn mật khẩu" : "Hiện mật khẩu");
});

document.addEventListener("submit", async event => {
  const form = event.target.closest("form[data-async]");
  if (!form) return;
  event.preventDefault();
  const button = form.querySelector("button");
  if (button) button.disabled = true;
  try {
    const response = await fetch(form.action, { method: "POST", body: new FormData(form), headers: { "X-Requested-With": "XMLHttpRequest" } });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "Không thể thực hiện thao tác.");
    if (form.dataset.async === "like") updateLike(result, form);
    if (form.dataset.async === "follow") updateFollow(result, form);
    if (form.dataset.async === "comment") addComment(result, form);
    if (form.dataset.async === "delete-comment") deleteComment(result);
  } catch (error) { alert(error.message || "Có lỗi xảy ra, vui lòng thử lại."); }
  finally { if (button) button.disabled = false; }
});

function updateLike(result, form) {
  document.querySelectorAll(`[data-like-count="${result.postId}"]`).forEach(element => {
    element.textContent = element.closest(".social-post-stats") ? `♥ ${result.count} lượt thích` : result.count;
  });
  const button = form.querySelector("button");
  if (!button) return;
  if (button.dataset.railLike !== undefined) {
    const icon = button.querySelector(".rail-icon"); const label = button.querySelector("[data-like-label]");
    if (icon) icon.textContent = result.isLiked ? "♥" : "♡";
    if (label) label.textContent = result.isLiked ? "Đã thích" : "Thích";
  } else if (button.classList.contains("feed-action")) button.textContent = result.isLiked ? "♥ Đã thích" : "♡ Thích";
  else button.innerHTML = `${result.isLiked ? "♥ Đã thích" : "♡ Thích"} · <span data-like-count="${result.postId}">${result.count}</span>`;
}

function updateFollow(result, form) {
  const button = form.querySelector("button"); const label = button?.querySelector("[data-follow-label]");
  if (label) label.textContent = result.isFollowing ? "Đã theo dõi" : "Theo dõi";
  else if (button) button.textContent = result.isFollowing ? "Đang theo dõi" : "Theo dõi";
  const followers = document.querySelector("[data-followers]"); if (followers) followers.textContent = result.followers;
}

function addComment(result, form) {
  form.querySelector("textarea").value = "";
  const count = document.querySelector("[data-comment-count]"); if (count) count.textContent = result.count;
  const list = document.querySelector("[data-comment-list]"); if (!list) return;
  const article = document.createElement("article"); article.className = `comment-item${result.isAdmin ? " admin-comment" : ""}`;
  const avatar = document.createElement("span"); avatar.className = `avatar${result.isAdmin ? " admin-avatar" : ""}`; avatar.textContent = result.authorName.charAt(0).toUpperCase();
  const body = document.createElement("div"); const name = document.createElement("strong"); name.className = "author-link"; name.textContent = result.authorName;
  const time = document.createElement("small"); time.textContent = result.createdAt; const content = document.createElement("p"); content.textContent = result.content;
  body.append(name, time, content);
  if (result.imageUrl) { const image = document.createElement("img"); image.className = "comment-media"; image.src = result.imageUrl; image.alt = "Ảnh bình luận"; body.append(image); }
  if (result.videoUrl) { const video = document.createElement("video"); video.className = "comment-media"; video.controls = true; video.preload = "metadata"; video.src = result.videoUrl; body.append(video); }
  article.append(avatar, body); list.prepend(article);
}

function deleteComment(result) { const item = document.querySelector(`[data-comment-id="${result.commentId}"]`); if (item) item.remove(); }

// Chủ đề toàn website: lựa chọn được lưu trên trình duyệt, mặc định theo hệ thống.
const KHOA_CHU_DE = "ky-thuat-nha-nong-theme";
const mediaChuDeToi = window.matchMedia("(prefers-color-scheme: dark)");
const tenChuDe = { light: "Sáng", dark: "Tối", system: "Theo hệ thống" };
const bieuTuongChuDe = { light: "☀", dark: "☾", system: "▣" };

function layLuaChonChuDe() {
  try {
    const value = localStorage.getItem(KHOA_CHU_DE);
    return ["light", "dark", "system"].includes(value) ? value : "system";
  } catch (_) {
    return "system";
  }
}

function capNhatChuDe(preference) {
  const theme = preference === "system"
    ? (mediaChuDeToi.matches ? "dark" : "light")
    : preference;
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.dataset.themePreference = preference;

  document.querySelectorAll("[data-theme-choice]").forEach(button => {
    button.setAttribute("aria-pressed", String(button.dataset.themeChoice === preference));
  });
  document.querySelectorAll(".theme-current-label").forEach(label => {
    label.textContent = tenChuDe[preference];
  });
  document.querySelectorAll(".theme-current-icon").forEach(icon => {
    icon.textContent = bieuTuongChuDe[preference];
  });
}

function datChuDe(preference) {
  if (!["light", "dark", "system"].includes(preference)) return;
  try { localStorage.setItem(KHOA_CHU_DE, preference); } catch (_) { /* Không chặn đổi giao diện khi trình duyệt tắt localStorage. */ }
  capNhatChuDe(preference);
}

document.addEventListener("click", event => {
  const choice = event.target.closest("[data-theme-choice]");
  if (!choice) return;
  datChuDe(choice.dataset.themeChoice);
  choice.closest("details")?.removeAttribute("open");
});

mediaChuDeToi.addEventListener("change", () => {
  if (layLuaChonChuDe() === "system") capNhatChuDe("system");
});

document.addEventListener("DOMContentLoaded", () => capNhatChuDe(layLuaChonChuDe()));
