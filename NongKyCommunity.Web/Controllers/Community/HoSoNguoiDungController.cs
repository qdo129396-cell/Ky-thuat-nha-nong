using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NongKyCommunity.Web.Data;
using NongKyCommunity.Web.Models;
using NongKyCommunity.Web.ViewModels;

namespace NongKyCommunity.Web.Controllers;

public sealed class ProfileController(AppDbContext database, IWebHostEnvironment environment) : Controller
{
    public async Task<IActionResult> Index(int id)
    {
        var user = await database.Users.AsNoTracking().SingleOrDefaultAsync(item => item.Id == id);
        if (user is null) return NotFound();
        var currentUserId = CurrentUserId();
        var posts = await database.Posts.AsNoTracking().Include(post => post.Category)
            .Where(post => post.AuthorId == id && (post.IsPublished || currentUserId == id)).OrderByDescending(post => post.CreatedAt).Take(24).ToListAsync();
        var totalLikes = await database.PostLikes.CountAsync(like => like.Post.AuthorId == id);
        return View("~/Views/Profile/TrangCaNhan.cshtml", new TrangCaNhanViewModel
        {
            User = user,
            Posts = posts,
            Followers = await database.UserFollows.CountAsync(follow => follow.FollowingId == id),
            Following = await database.UserFollows.CountAsync(follow => follow.FollowerId == id),
            TotalLikes = totalLikes,
            IsOwner = currentUserId == id,
            IsFollowing = currentUserId.HasValue && await database.UserFollows.AnyAsync(follow => follow.FollowerId == currentUserId && follow.FollowingId == id)
        });
    }

    [Authorize, HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> ToggleFollow(int id)
    {
        var currentUserId = CurrentUserId()!.Value;
        if (id == currentUserId) return RedirectToAction(nameof(Index), new { id });
        if (!await database.Users.AnyAsync(user => user.Id == id)) return NotFound();
        var follow = await database.UserFollows.SingleOrDefaultAsync(item => item.FollowerId == currentUserId && item.FollowingId == id);
        var isFollowing = follow is null;
        if (isFollowing) database.UserFollows.Add(new UserFollow { FollowerId = currentUserId, FollowingId = id }); else database.UserFollows.Remove(follow!);
        await database.SaveChangesAsync();
        if (IsAjaxRequest()) return Json(new { isFollowing, followers = await database.UserFollows.CountAsync(item => item.FollowingId == id) });
        return RedirectToAction(nameof(Index), new { id });
    }

    [Authorize]
    public IActionResult MyProfile() => RedirectToAction(nameof(Index), new { id = CurrentUserId()!.Value });

    [Authorize, HttpGet]
    public async Task<IActionResult> Edit()
    {
        var user = await database.Users.FindAsync(CurrentUserId()!.Value);
        return user is null ? NotFound() : View("~/Views/Profile/ChinhSuaHoSo.cshtml", user);
    }

    [Authorize, HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> Edit(string fullName, string? bio, string? farmingArea, string? experience, IFormFile? avatar)
    {
        var user = await database.Users.FindAsync(CurrentUserId()!.Value);
        if (user is null) return NotFound();
        if (string.IsNullOrWhiteSpace(fullName) || fullName.Trim().Length > 100)
        {
            ModelState.AddModelError(nameof(fullName), "Tên hiển thị phải có từ 1 đến 100 ký tự.");
            return View("~/Views/Profile/ChinhSuaHoSo.cshtml", user);
        }
        if (avatar is not null && avatar.Length > 0)
        {
            var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".webp" };
            var extension = Path.GetExtension(avatar.FileName).ToLowerInvariant();
            if (avatar.Length > 5 * 1024 * 1024 || !allowedExtensions.Contains(extension) || !avatar.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
            {
                ModelState.AddModelError(string.Empty, "Ảnh đại diện phải là JPG, PNG hoặc WebP và không quá 5 MB.");
                return View("~/Views/Profile/ChinhSuaHoSo.cshtml", user);
            }
            var folder = Path.Combine(environment.WebRootPath, "uploads", "avatars");
            Directory.CreateDirectory(folder);
            var fileName = $"{Guid.NewGuid():N}{extension}";
            await using var stream = System.IO.File.Create(Path.Combine(folder, fileName));
            await avatar.CopyToAsync(stream);
            user.AvatarUrl = $"/uploads/avatars/{fileName}";
        }
        user.FullName = fullName.Trim();
        user.Bio = bio?.Trim();
        user.FarmingArea = farmingArea?.Trim();
        user.Experience = experience?.Trim();
        await database.SaveChangesAsync();
        return RedirectToAction(nameof(Index), new { id = user.Id });
    }

    private int? CurrentUserId() => int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;
    private bool IsAjaxRequest() => string.Equals(Request.Headers["X-Requested-With"], "XMLHttpRequest", StringComparison.OrdinalIgnoreCase);
}
