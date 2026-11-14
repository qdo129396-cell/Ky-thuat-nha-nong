using NongKyCommunity.Web.Models;

namespace NongKyCommunity.Web.ViewModels;

public sealed class CommunityRightSidebarViewModel
{
    public IReadOnlyList<Post> Notifications { get; init; } = [];
    public IReadOnlyList<Crop> Crops { get; init; } = [];
    public IReadOnlyList<CommunityMemberViewModel> Members { get; init; } = [];
}

public sealed class CommunityMemberViewModel
{
    public string FullName { get; init; } = string.Empty;
    public int PostCount { get; init; }
}
