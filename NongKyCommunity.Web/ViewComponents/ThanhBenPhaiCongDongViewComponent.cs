using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NongKyCommunity.Web.Data;
using NongKyCommunity.Web.ViewModels;

namespace NongKyCommunity.Web.ViewComponents;

public sealed class CommunityRightSidebarViewComponent(AppDbContext database) : ViewComponent
{
    public async Task<IViewComponentResult> InvokeAsync()
    {
        var notifications = await database.Posts.AsNoTracking()
            .Include(post => post.Author)
            .Include(post => post.Category)
            .Where(post => post.IsPublished && post.Category.Slug == "thong-bao" && post.Author.Role == NongKyCommunity.Web.Models.UserRole.Admin)
            .OrderByDescending(post => post.CreatedAt)
            .ToListAsync();
        var crops = await database.Crops.AsNoTracking()
            .Where(crop => crop.IsActive)
            .OrderBy(crop => crop.Name)
            .Take(5)
            .ToListAsync();
        var members = await database.Users.AsNoTracking()
            .Select(user => new CommunityMemberViewModel
            {
                FullName = user.FullName,
                PostCount = database.Posts.Count(post => post.AuthorId == user.Id)
            })
            .OrderByDescending(member => member.PostCount)
            .ThenBy(member => member.FullName)
            .Take(4)
            .ToListAsync();

        return View("~/Views/Shared/Components/CommunityRightSidebar/ThanhBenPhai.cshtml", new CommunityRightSidebarViewModel
        {
            Notifications = notifications,
            Crops = crops,
            Members = members
        });
    }
}
