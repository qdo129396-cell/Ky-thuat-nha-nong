using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NongKyCommunity.Web.Data;
using NongKyCommunity.Web.Models;

namespace NongKyCommunity.Web.ViewComponents;

public sealed class CommunityLeftSidebarViewComponent(AppDbContext database) : ViewComponent
{
    public async Task<IViewComponentResult> InvokeAsync()
    {
        AppUser? currentUser = null;
        if (int.TryParse(UserClaimsPrincipal.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
        {
            currentUser = await database.Users.AsNoTracking().SingleOrDefaultAsync(user => user.Id == userId);
        }

        return View("~/Views/Shared/Components/CommunityLeftSidebar/ThanhBenTrai.cshtml", currentUser);
    }
}
