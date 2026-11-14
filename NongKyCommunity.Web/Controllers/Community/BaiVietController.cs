using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NongKyCommunity.Web.Data;
using NongKyCommunity.Web.Models;

namespace NongKyCommunity.Web.Controllers;

public sealed class PostsController(AppDbContext database, IWebHostEnvironment environment) : Controller
{
    public async Task<IActionResult> Index(string? search, string? q, string? category, string? crop, int page = 1)
    {
        search = string.IsNullOrWhiteSpace(search) ? q : search;
        IQueryable<Post> query = database.Posts.AsNoTracking().Include(item => item.Author).Include(item => item.Category).Include(item => item.Crop).Where(item => item.IsPublished);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(item => item.Title.Contains(term) || (item.Excerpt != null && item.Excerpt.Contains(term)) || item.Content.Contains(term));
        }
        if (!string.IsNullOrWhiteSpace(category)) query = query.Where(item => item.Category.Slug == category);
        if (!string.IsNullOrWhiteSpace(crop)) query = query.Where(item => item.Crop != null && item.Crop.Slug == crop);

        const int pageSize = 9;
        var total = await query.CountAsync();
        var pages = Math.Max(1, (int)Math.Ceiling(total / (double)pageSize));
        page = Math.Clamp(page, 1, pages);
        ViewBag.Query = search; ViewBag.Category = category; ViewBag.Crop = crop;
        ViewBag.Categories = await database.Categories.OrderBy(item => item.Name).ToListAsync();
        ViewBag.Crops = await database.Crops.Where(item => item.IsActive).OrderBy(item => item.Name).ToListAsync();
        ViewBag.Page = page; ViewBag.TotalPages = pages;

        var posts = await query.OrderByDescending(item => item.CreatedAt).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        var postIds = posts.Select(post => post.Id).ToList();
        ViewBag.LikeCounts = await database.PostLikes.Where(like => postIds.Contains(like.PostId)).GroupBy(like => like.PostId).ToDictionaryAsync(group => group.Key, group => group.Count());
        ViewBag.CommentCounts = await database.Comments.Where(comment => postIds.Contains(comment.PostId)).GroupBy(comment => comment.PostId).ToDictionaryAsync(group => group.Key, group => group.Count());
        var currentUserId = CurrentUserId();
        ViewBag.CurrentUserAvatar = currentUserId.HasValue
            ? await database.Users.Where(user => user.Id == currentUserId.Value).Select(user => user.AvatarUrl).SingleOrDefaultAsync()
            : null;
        ViewBag.LikedPostIds = currentUserId.HasValue ? await database.PostLikes.Where(like => like.UserId == currentUserId.Value && postIds.Contains(like.PostId)).Select(like => like.PostId).ToListAsync() : [];
        return View("~/Views/Posts/DanhSachBaiViet.cshtml", posts);
    }

    public async Task<IActionResult> Details(string slug)
    {
        var post = await database.Posts.Include(item => item.Author).Include(item => item.Category).Include(item => item.Crop)
            .Include(item => item.Comments).ThenInclude(comment => comment.User).SingleOrDefaultAsync(item => item.Slug == slug);
        if (post is null || (!post.IsPublished && !CanViewUnpublished(post))) return NotFound();
        var currentUserId = CurrentUserId();
        ViewBag.LikeCount = await database.PostLikes.CountAsync(like => like.PostId == post.Id);
        ViewBag.IsLiked = currentUserId.HasValue && await database.PostLikes.AnyAsync(like => like.PostId == post.Id && like.UserId == currentUserId.Value);
        ViewBag.CanEdit = CanEdit(post);
        ViewBag.CanDelete = CanDelete(post);
        ViewBag.CanHide = User.IsInRole("Admin") && post.IsPublished;
        ViewBag.IsAdminPost = post.Author.Role == UserRole.Admin;
        return View("~/Views/Posts/ChiTietBaiViet.cshtml", post);
    }

    [Authorize]
    public async Task<IActionResult> MyPosts(int page = 1)
    {
        var userId = CurrentUserId()!.Value;
        const int pageSize = 9;
        IQueryable<Post> query = database.Posts.AsNoTracking().Include(item => item.Author).Include(item => item.Category).Where(item => item.AuthorId == userId);
        var total = await query.CountAsync();
        var totalPages = Math.Max(1, (int)Math.Ceiling(total / (double)pageSize));
        page = Math.Clamp(page, 1, totalPages);
        ViewBag.Page = page; ViewBag.TotalPages = totalPages;
        return View("~/Views/Posts/BaiVietCuaToi.cshtml", await query.OrderByDescending(item => item.CreatedAt).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync());
    }

    [Authorize, HttpGet]
    public async Task<IActionResult> Create()
    {
        await LoadCategoriesAsync();
        return View("~/Views/Posts/TaoBaiViet.cshtml", new Post { IsPublished = true });
    }

    [Authorize, HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> Create(Post post, IFormFile? image, IFormFile? video)
    {
        post.AuthorId = CurrentUserId()!.Value;
        ModelState.Remove(nameof(post.Author)); ModelState.Remove(nameof(post.Category)); ModelState.Remove(nameof(post.Slug)); ModelState.Remove(nameof(post.Crop)); ModelState.Remove(nameof(post.Comments));
        if (!ModelState.IsValid || !await CanUseCategoryAsync(post.CategoryId))
        {
            if (!await CanUseCategoryAsync(post.CategoryId)) ModelState.AddModelError(nameof(post.CategoryId), "Danh mục không hợp lệ.");
            await LoadCategoriesAsync();
            return View("~/Views/Posts/TaoBaiViet.cshtml", post);
        }
        post.Slug = $"{ToSlug(post.Title)}-{Guid.NewGuid().ToString("N")[..6]}";
        if (!await TrySavePostImageAsync(image, post) || !await TrySavePostVideoAsync(video, post)) { await LoadCategoriesAsync(); return View("~/Views/Posts/TaoBaiViet.cshtml", post); }
        database.Posts.Add(post);
        await database.SaveChangesAsync();
        return RedirectToAction(nameof(Details), new { post.Slug });
    }

    [Authorize, HttpGet]
    public async Task<IActionResult> Edit(int id)
    {
        var post = await database.Posts.FindAsync(id);
        if (post is null) return NotFound();
        if (!CanEdit(post)) return Forbid();
        await LoadCategoriesAsync();
        return View("~/Views/Posts/ChinhSuaBaiViet.cshtml", post);
    }

    [Authorize, HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> Edit(int id, string title, string? excerpt, string content, int categoryId, bool isPublished, IFormFile? image, IFormFile? video)
    {
        var post = await database.Posts.FindAsync(id);
        if (post is null) return NotFound();
        if (!CanEdit(post)) return Forbid();
        if (string.IsNullOrWhiteSpace(title) || string.IsNullOrWhiteSpace(content) || !await CanUseCategoryAsync(categoryId))
        {
            ModelState.AddModelError(string.Empty, "Vui lòng nhập đủ tiêu đề, nội dung và danh mục hợp lệ.");
            post.Title = title; post.Excerpt = excerpt; post.Content = content; post.CategoryId = categoryId; post.IsPublished = isPublished;
            await LoadCategoriesAsync();
            return View("~/Views/Posts/ChinhSuaBaiViet.cshtml", post);
        }
        if (!await TrySavePostImageAsync(image, post) || !await TrySavePostVideoAsync(video, post)) { await LoadCategoriesAsync(); return View("~/Views/Posts/ChinhSuaBaiViet.cshtml", post); }
        post.Title = title.Trim(); post.Excerpt = excerpt?.Trim(); post.Content = content.Trim(); post.CategoryId = categoryId; post.IsPublished = isPublished;
        await database.SaveChangesAsync();
        return RedirectToAction(nameof(Details), new { post.Slug });
    }

    [Authorize, HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> Delete(int id)
    {
        var post = await database.Posts.FindAsync(id);
        if (post is null) return NotFound();
        if (!CanDelete(post)) return Forbid();
        database.Posts.Remove(post);
        await database.SaveChangesAsync();
        return RedirectToAction(nameof(MyPosts));
    }

    [Authorize(Roles = "Admin"), HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> Hide(int id, string? returnSlug)
    {
        var post = await database.Posts.FindAsync(id);
        if (post is null) return NotFound();
        post.IsPublished = false;
        await database.SaveChangesAsync();
        return RedirectToAction(nameof(Index));
    }

    [Authorize, HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> Publish(int id)
    {
        var post = await database.Posts.FindAsync(id);
        if (post is null) return NotFound();
        if (!CanEdit(post)) return Forbid();
        post.IsPublished = true;
        await database.SaveChangesAsync();
        return RedirectToAction(nameof(MyPosts));
    }

    [Authorize, HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> Report(int postId, string reason, string? returnSlug)
    {
        var userId = CurrentUserId()!.Value;
        var post = await database.Posts.AsNoTracking().SingleOrDefaultAsync(item => item.Id == postId && item.IsPublished);
        if (post is null) return NotFound();
        if (post.AuthorId == userId) { TempData["ReportError"] = "Bạn không thể báo cáo bài viết của chính mình."; return RedirectToAction(nameof(Details), new { slug = returnSlug }); }
        if (string.IsNullOrWhiteSpace(reason) || reason.Trim().Length > 500) { TempData["ReportError"] = "Vui lòng nhập lý do báo cáo, tối đa 500 ký tự."; return RedirectToAction(nameof(Details), new { slug = returnSlug }); }
        if (await database.PostReports.AnyAsync(item => item.PostId == postId && item.UserId == userId && !item.IsResolved))
        {
            TempData["ReportError"] = "Bạn đã gửi báo cáo cho bài viết này. Quản trị viên sẽ sớm xem xét.";
            return RedirectToAction(nameof(Details), new { slug = returnSlug });
        }
        database.PostReports.Add(new PostReport { PostId = postId, UserId = userId, Reason = reason.Trim() });
        await database.SaveChangesAsync();
        TempData["ReportMessage"] = "Báo cáo đã được gửi đến Quản trị viên để xem xét.";
        return RedirectToAction(nameof(Details), new { slug = returnSlug });
    }

    [Authorize, HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> ToggleLike(int id, string? returnSlug, string? returnUrl)
    {
        var userId = CurrentUserId()!.Value;
        if (!await database.Posts.AnyAsync(post => post.Id == id && post.IsPublished)) return NotFound();
        var like = await database.PostLikes.SingleOrDefaultAsync(item => item.PostId == id && item.UserId == userId);
        var isLiked = like is null;
        if (isLiked) database.PostLikes.Add(new PostLike { PostId = id, UserId = userId }); else database.PostLikes.Remove(like!);
        await database.SaveChangesAsync();
        if (IsAjaxRequest()) return Json(new { postId = id, isLiked, count = await database.PostLikes.CountAsync(item => item.PostId == id) });
        return ReturnToPost(returnUrl, returnSlug);
    }

    [Authorize, HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> AddComment(int postId, string? content, IFormFile? image, IFormFile? video, string? returnSlug, string? returnUrl)
    {
        var post = await database.Posts.Include(item => item.Author).SingleOrDefaultAsync(item => item.Id == postId && item.IsPublished);
        if (post is null) return NotFound();
        if (post.Author.Role == UserRole.Admin && !User.IsInRole("Admin")) return Forbid();
        if ((string.IsNullOrWhiteSpace(content) && (image is null || image.Length == 0) && (video is null || video.Length == 0)) || (!string.IsNullOrWhiteSpace(content) && content.Trim().Length > 2000))
        {
            TempData["CommentError"] = "Bình luận phải có từ 1 đến 2.000 ký tự.";
            if (IsAjaxRequest()) return BadRequest(new { message = "Bình luận phải có từ 1 đến 2.000 ký tự." });
            return ReturnToPost(returnUrl, returnSlug);
        }
        var comment = new Comment { PostId = postId, UserId = CurrentUserId()!.Value, Content = content?.Trim() ?? string.Empty };
        if (!await TrySaveCommentMediaAsync(image, video, comment))
        {
            if (IsAjaxRequest()) return BadRequest(new { message = TempData["CommentError"]?.ToString() ?? "Tệp đính kèm không hợp lệ." });
            return ReturnToPost(returnUrl, returnSlug);
        }
        database.Comments.Add(comment);
        await database.SaveChangesAsync();
        if (IsAjaxRequest())
        {
            var user = await database.Users.FindAsync(CurrentUserId()!.Value);
            return Json(new { postId, content = comment.Content, imageUrl = comment.ImageUrl, videoUrl = comment.VideoUrl, authorName = user?.FullName ?? "Thành viên", isAdmin = user?.Role == UserRole.Admin, createdAt = DateTime.Now.ToString("dd/MM/yyyy HH:mm"), count = await database.Comments.CountAsync(item => item.PostId == postId) });
        }
        return ReturnToPost(returnUrl, returnSlug);
    }

    [Authorize, HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> DeleteComment(int id, string? returnSlug, string? returnUrl)
    {
        var comment = await database.Comments.FindAsync(id);
        if (comment is null) return NotFound();
        if (comment.UserId != CurrentUserId() && !User.IsInRole("Admin")) return Forbid();
        database.Comments.Remove(comment);
        await database.SaveChangesAsync();
        if (IsAjaxRequest()) return Json(new { commentId = id });
        return ReturnToPost(returnUrl, returnSlug);
    }

    private async Task LoadCategoriesAsync()
    {
        IQueryable<Category> query = database.Categories;
        if (!User.IsInRole("Admin")) query = query.Where(item => item.Slug != "thong-bao");
        ViewBag.Categories = await query.OrderBy(item => item.Name).ToListAsync();
    }

    private Task<bool> CanUseCategoryAsync(int categoryId) => database.Categories.AnyAsync(item => item.Id == categoryId && (User.IsInRole("Admin") || item.Slug != "thong-bao"));
    private IActionResult ReturnToPost(string? returnUrl, string? returnSlug) => !string.IsNullOrWhiteSpace(returnUrl) && Url.IsLocalUrl(returnUrl) ? LocalRedirect(returnUrl) : RedirectToAction(nameof(Details), new { slug = returnSlug });

    private async Task<bool> TrySavePostImageAsync(IFormFile? image, Post post)
    {
        if (image is null || image.Length == 0) return true;
        var extension = Path.GetExtension(image.FileName).ToLowerInvariant();
        var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".webp" };
        if (image.Length > 5 * 1024 * 1024 || !allowedExtensions.Contains(extension) || !image.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
        {
            ModelState.AddModelError(string.Empty, "Ảnh bài viết phải là JPG, PNG hoặc WebP và không quá 5 MB.");
            return false;
        }
        var folder = Path.Combine(environment.WebRootPath, "uploads", "posts");
        Directory.CreateDirectory(folder);
        var fileName = $"{Guid.NewGuid():N}{extension}";
        await using var stream = System.IO.File.Create(Path.Combine(folder, fileName));
        await image.CopyToAsync(stream);
        post.ImageUrl = $"/uploads/posts/{fileName}";
        return true;
    }

    private async Task<bool> TrySavePostVideoAsync(IFormFile? video, Post post)
    {
        if (video is null || video.Length == 0) return true;
        var extension = Path.GetExtension(video.FileName).ToLowerInvariant();
        if (video.Length > 50 * 1024 * 1024 || !new[] { ".mp4", ".webm" }.Contains(extension) || !video.ContentType.StartsWith("video/", StringComparison.OrdinalIgnoreCase))
        { ModelState.AddModelError(string.Empty, "Video bài viết phải là MP4 hoặc WebM và không quá 50 MB."); return false; }
        var folder = Path.Combine(environment.WebRootPath, "uploads", "posts", "videos"); Directory.CreateDirectory(folder);
        var fileName = $"{Guid.NewGuid():N}{extension}"; await using var stream = System.IO.File.Create(Path.Combine(folder, fileName)); await video.CopyToAsync(stream);
        post.VideoUrl = $"/uploads/posts/videos/{fileName}";
        return true;
    }

    private async Task<bool> TrySaveCommentMediaAsync(IFormFile? image, IFormFile? video, Comment comment)
    {
        if (image is not null && image.Length > 0)
        {
            var extension = Path.GetExtension(image.FileName).ToLowerInvariant();
            if (image.Length > 5 * 1024 * 1024 || !new[] { ".jpg", ".jpeg", ".png", ".webp" }.Contains(extension) || !image.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase)) { TempData["CommentError"] = "Ảnh bình luận phải là JPG, PNG hoặc WebP và không quá 5 MB."; return false; }
            var folder = Path.Combine(environment.WebRootPath, "uploads", "comments"); Directory.CreateDirectory(folder); var fileName = $"{Guid.NewGuid():N}{extension}";
            await using var stream = System.IO.File.Create(Path.Combine(folder, fileName)); await image.CopyToAsync(stream); comment.ImageUrl = $"/uploads/comments/{fileName}";
        }
        if (video is not null && video.Length > 0)
        {
            var extension = Path.GetExtension(video.FileName).ToLowerInvariant();
            if (video.Length > 25 * 1024 * 1024 || !new[] { ".mp4", ".webm" }.Contains(extension) || !video.ContentType.StartsWith("video/", StringComparison.OrdinalIgnoreCase)) { TempData["CommentError"] = "Video bình luận phải là MP4 hoặc WebM và không quá 25 MB."; return false; }
            var folder = Path.Combine(environment.WebRootPath, "uploads", "comments", "videos"); Directory.CreateDirectory(folder); var fileName = $"{Guid.NewGuid():N}{extension}";
            await using var stream = System.IO.File.Create(Path.Combine(folder, fileName)); await video.CopyToAsync(stream); comment.VideoUrl = $"/uploads/comments/videos/{fileName}";
        }
        return true;
    }

    private int? CurrentUserId() => int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;
    private bool IsAjaxRequest() => string.Equals(Request.Headers["X-Requested-With"], "XMLHttpRequest", StringComparison.OrdinalIgnoreCase);
    private bool CanEdit(Post post) => CurrentUserId() == post.AuthorId;
    private bool CanDelete(Post post) => CurrentUserId() == post.AuthorId || User.IsInRole("Admin");
    private bool CanViewUnpublished(Post post) => CurrentUserId() == post.AuthorId || User.IsInRole("Admin");
    private static string ToSlug(string? value) => string.Concat((value ?? string.Empty).Trim().ToLowerInvariant().Select(character => char.IsLetterOrDigit(character) ? character : '-')).Trim('-');
}
