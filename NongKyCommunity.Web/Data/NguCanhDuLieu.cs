using Microsoft.EntityFrameworkCore;
using NongKyCommunity.Web.Models;

namespace NongKyCommunity.Web.Data;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<AppUser> Users => Set<AppUser>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Post> Posts => Set<Post>();
    public DbSet<Crop> Crops => Set<Crop>();
    public DbSet<Comment> Comments => Set<Comment>();
    public DbSet<PostLike> PostLikes => Set<PostLike>();
    public DbSet<UserFollow> UserFollows => Set<UserFollow>();
    public DbSet<PostReport> PostReports => Set<PostReport>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        builder.Entity<AppUser>().Property(item => item.Role).HasConversion<string>().HasMaxLength(20);
        builder.Entity<AppUser>().HasIndex(item => item.Email).IsUnique();
        builder.Entity<Category>().HasIndex(item => item.Slug).IsUnique();
        builder.Entity<Post>().HasIndex(item => item.Slug).IsUnique();
        builder.Entity<Crop>().HasIndex(item => item.Slug).IsUnique();
        builder.Entity<Post>().HasOne(item => item.Author).WithMany().HasForeignKey(item => item.AuthorId).OnDelete(DeleteBehavior.Restrict);
        builder.Entity<Post>().HasOne(item => item.Category).WithMany().HasForeignKey(item => item.CategoryId).OnDelete(DeleteBehavior.Restrict);
        builder.Entity<Post>().HasOne(item => item.Crop).WithMany(item => item.Posts).HasForeignKey(item => item.CropId).OnDelete(DeleteBehavior.SetNull);
        builder.Entity<Comment>().HasOne(item => item.Post).WithMany(item => item.Comments).HasForeignKey(item => item.PostId).OnDelete(DeleteBehavior.Cascade);
        builder.Entity<Comment>().HasOne(item => item.User).WithMany().HasForeignKey(item => item.UserId).OnDelete(DeleteBehavior.Restrict);
        builder.Entity<PostLike>().HasIndex(item => new { item.PostId, item.UserId }).IsUnique();
        builder.Entity<PostLike>().HasOne(item => item.Post).WithMany().HasForeignKey(item => item.PostId).OnDelete(DeleteBehavior.Cascade);
        builder.Entity<PostLike>().HasOne(item => item.User).WithMany().HasForeignKey(item => item.UserId).OnDelete(DeleteBehavior.Restrict);
        builder.Entity<UserFollow>().HasIndex(item => new { item.FollowerId, item.FollowingId }).IsUnique();
        builder.Entity<UserFollow>().HasOne(item => item.Follower).WithMany().HasForeignKey(item => item.FollowerId).OnDelete(DeleteBehavior.Restrict);
        builder.Entity<UserFollow>().HasOne(item => item.Following).WithMany().HasForeignKey(item => item.FollowingId).OnDelete(DeleteBehavior.Restrict);
        builder.Entity<PostReport>().HasIndex(item => new { item.PostId, item.IsResolved });
        builder.Entity<PostReport>().HasOne(item => item.Post).WithMany().HasForeignKey(item => item.PostId).OnDelete(DeleteBehavior.Cascade);
        builder.Entity<PostReport>().HasOne(item => item.User).WithMany().HasForeignKey(item => item.UserId).OnDelete(DeleteBehavior.Restrict);
    }
}
