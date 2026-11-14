using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NongKyCommunity.Web.Data;
using NongKyCommunity.Web.Models;
using NongKyCommunity.Web.ViewModels;

namespace NongKyCommunity.Web.Controllers;

[Authorize(Roles = "Admin")]
public sealed class AdminController(AppDbContext database) : Controller
{
    public async Task<IActionResult> Index()
    {
        var model = new BangDieuKhienQuanTriViewModel
        {
            Users = await database.Users.CountAsync(), Posts = await database.Posts.CountAsync(), Comments = await database.Comments.CountAsync(),
            Categories = await database.Categories.CountAsync(), Crops = await database.Crops.CountAsync(),
            RecentUsers = await database.Users.AsNoTracking().OrderByDescending(user => user.CreatedAt).Take(5).ToListAsync(),
            RecentPosts = await database.Posts.AsNoTracking().Include(post => post.Author).OrderByDescending(post => post.CreatedAt).Take(5).ToListAsync()
        };
        return View("~/Views/Admin/TrangQuanTri.cshtml", model);
    }

    public async Task<IActionResult> Users(string? search)
    {
        var query = database.Users.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(search)) query = query.Where(user => user.FullName.Contains(search) || user.Email.Contains(search));
        ViewBag.Search = search;
        ViewBag.PostCounts = await database.Posts.GroupBy(post => post.AuthorId).ToDictionaryAsync(group => group.Key, group => group.Count());
        return View("~/Views/Admin/NguoiDung.cshtml", await query.OrderByDescending(user => user.CreatedAt).ToListAsync());
    }

    public async Task<IActionResult> Posts(string? search, int? categoryId)
    {
        IQueryable<Post> query = database.Posts.AsNoTracking().Include(post => post.Author).Include(post => post.Category);
        if (!string.IsNullOrWhiteSpace(search)) query = query.Where(post => post.Title.Contains(search) || post.Content.Contains(search));
        if (categoryId.HasValue) query = query.Where(post => post.CategoryId == categoryId.Value);
        ViewBag.Categories = await database.Categories.OrderBy(category => category.Name).ToListAsync();
        ViewBag.Search = search; ViewBag.CategoryId = categoryId;
        return View("~/Views/Admin/BaiViet.cshtml", await query.OrderByDescending(post => post.CreatedAt).ToListAsync());
    }

    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> DeletePost(int id)
    {
        var post = await database.Posts.FindAsync(id);
        if (post is not null) { database.Posts.Remove(post); await database.SaveChangesAsync(); TempData["Message"] = "Đã xóa bài viết."; }
        return RedirectToAction(nameof(Posts));
    }

    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> HidePost(int id)
    {
        var post = await database.Posts.FindAsync(id);
        if (post is not null) { post.IsPublished = false; await database.SaveChangesAsync(); }
        return RedirectToAction(nameof(Posts));
    }

    public async Task<IActionResult> Comments(string? search)
    {
        IQueryable<Comment> query = database.Comments.AsNoTracking().Include(comment => comment.User).Include(comment => comment.Post);
        if (!string.IsNullOrWhiteSpace(search)) query = query.Where(comment => comment.Content.Contains(search) || comment.User.FullName.Contains(search));
        ViewBag.Search = search;
        return View("~/Views/Admin/BinhLuan.cshtml", await query.OrderByDescending(comment => comment.CreatedAt).ToListAsync());
    }

    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> DeleteComment(int id)
    {
        var comment = await database.Comments.FindAsync(id);
        if (comment is not null) { database.Comments.Remove(comment); await database.SaveChangesAsync(); TempData["Message"] = "Đã xóa bình luận."; }
        return RedirectToAction(nameof(Comments));
    }

    public async Task<IActionResult> Reports(bool resolved = false)
    {
        var reports = await database.PostReports.AsNoTracking().Include(item => item.Post).Include(item => item.User)
            .Where(item => item.IsResolved == resolved).OrderByDescending(item => item.CreatedAt).ToListAsync();
        ViewBag.Resolved = resolved;
        return View("~/Views/Admin/BaoCao.cshtml", reports);
    }

    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> ResolveReport(int id)
    {
        var report = await database.PostReports.FindAsync(id);
        if (report is not null) { report.IsResolved = true; report.ResolvedAt = DateTime.UtcNow; await database.SaveChangesAsync(); }
        return RedirectToAction(nameof(Reports));
    }

    public async Task<IActionResult> Categories() => View("~/Views/Admin/DanhMuc.cshtml", await database.Categories.OrderBy(category => category.Name).ToListAsync());

    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> AddCategory(string name)
    {
        var slug = Slug(name);
        if (!string.IsNullOrWhiteSpace(name) && !await database.Categories.AnyAsync(category => category.Slug == slug))
        { database.Categories.Add(new Category { Name = name.Trim(), Slug = slug }); await database.SaveChangesAsync(); }
        return RedirectToAction(nameof(Categories));
    }

    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> DeleteCategory(int id)
    {
        if (await database.Posts.AnyAsync(post => post.CategoryId == id)) TempData["Error"] = "Không thể xóa danh mục đang có bài viết.";
        else { var category = await database.Categories.FindAsync(id); if (category is not null) { database.Categories.Remove(category); await database.SaveChangesAsync(); } }
        return RedirectToAction(nameof(Categories));
    }

    public async Task<IActionResult> Crops() => View("~/Views/Admin/LoaiCay.cshtml", await database.Crops.OrderBy(crop => crop.Name).ToListAsync());

    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> AddCrop(string name, string? description)
    {
        var slug = Slug(name);
        if (!string.IsNullOrWhiteSpace(name) && !await database.Crops.AnyAsync(crop => crop.Slug == slug))
        { database.Crops.Add(new Crop { Name = name.Trim(), Slug = slug, Description = description?.Trim() }); await database.SaveChangesAsync(); }
        return RedirectToAction(nameof(Crops));
    }

    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> ToggleCrop(int id)
    {
        var crop = await database.Crops.FindAsync(id);
        if (crop is not null) { crop.IsActive = !crop.IsActive; await database.SaveChangesAsync(); }
        return RedirectToAction(nameof(Crops));
    }

    private static string Slug(string? value) => string.Concat((value ?? string.Empty).Trim().ToLowerInvariant().Select(character => char.IsLetterOrDigit(character) ? character : '-')).Trim('-');
}
