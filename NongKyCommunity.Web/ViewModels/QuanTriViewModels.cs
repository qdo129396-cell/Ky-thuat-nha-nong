using NongKyCommunity.Web.Models;

namespace NongKyCommunity.Web.ViewModels;

public sealed class BangDieuKhienQuanTriViewModel
{
    public int Users { get; init; }
    public int Posts { get; init; }
    public int Comments { get; init; }
    public int Categories { get; init; }
    public int Crops { get; init; }
    public IReadOnlyList<AppUser> RecentUsers { get; init; } = [];
    public IReadOnlyList<Post> RecentPosts { get; init; } = [];
}
