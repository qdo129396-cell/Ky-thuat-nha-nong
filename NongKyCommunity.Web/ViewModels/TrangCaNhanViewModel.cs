using NongKyCommunity.Web.Models;

namespace NongKyCommunity.Web.ViewModels;

public sealed class TrangCaNhanViewModel
{
    public AppUser User { get; init; } = null!;
    public IReadOnlyList<Post> Posts { get; init; } = [];
    public int Followers { get; init; }
    public int Following { get; init; }
    public int TotalLikes { get; init; }
    public bool IsFollowing { get; init; }
    public bool IsOwner { get; init; }
}
