using System.ComponentModel.DataAnnotations;

namespace NongKyCommunity.Web.Models;

public enum UserRole { User, Admin }

public sealed class AppUser
{
    public int Id { get; set; }
    [Required(ErrorMessage = "Vui lòng nhập họ và tên."), StringLength(100, ErrorMessage = "Họ và tên không được quá 100 ký tự.")] public string FullName { get; set; } = string.Empty;
    [Required(ErrorMessage = "Vui lòng nhập email."), EmailAddress(ErrorMessage = "Email không đúng định dạng."), StringLength(200, ErrorMessage = "Email không được quá 200 ký tự.")] public string Email { get; set; } = string.Empty;
    [Required(ErrorMessage = "Mật khẩu không hợp lệ.")] public string PasswordHash { get; set; } = string.Empty;
    public UserRole Role { get; set; } = UserRole.User;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    [StringLength(200)] public string? AvatarUrl { get; set; }
    [StringLength(1000)] public string? Bio { get; set; }
    [StringLength(150)] public string? FarmingArea { get; set; }
    [StringLength(500)] public string? Experience { get; set; }
}

public sealed class Category
{
    public int Id { get; set; }
    [Required(ErrorMessage = "Vui lòng nhập tên danh mục."), StringLength(80, ErrorMessage = "Tên danh mục không được quá 80 ký tự.")] public string Name { get; set; } = string.Empty;
    [Required, StringLength(100)] public string Slug { get; set; } = string.Empty;
}

public sealed class Crop
{
    public int Id { get; set; }
    [Required, StringLength(80)] public string Name { get; set; } = string.Empty;
    [Required, StringLength(100)] public string Slug { get; set; } = string.Empty;
    [StringLength(500)] public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
    public ICollection<Post> Posts { get; set; } = [];
}

public sealed class Post
{
    public int Id { get; set; }
    [Required(ErrorMessage = "Vui lòng nhập tiêu đề bài viết."), StringLength(180, ErrorMessage = "Tiêu đề không được quá 180 ký tự."), Display(Name = "Tiêu đề")] public string Title { get; set; } = string.Empty;
    [Required, StringLength(200)] public string Slug { get; set; } = string.Empty;
    [StringLength(500, ErrorMessage = "Mô tả ngắn không được quá 500 ký tự."), Display(Name = "Mô tả ngắn")] public string? Excerpt { get; set; }
    [Required(ErrorMessage = "Vui lòng nhập nội dung bài viết."), Display(Name = "Nội dung")] public string Content { get; set; } = string.Empty;
    public bool IsPublished { get; set; }
    [StringLength(300)] public string? ImageUrl { get; set; }
    [StringLength(300)] public string? VideoUrl { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public int AuthorId { get; set; }
    public AppUser Author { get; set; } = null!;
    public int CategoryId { get; set; }
    public Category Category { get; set; } = null!;
    public int? CropId { get; set; }
    public Crop? Crop { get; set; }
    public ICollection<Comment> Comments { get; set; } = [];
}

public sealed class Comment
{
    public int Id { get; set; }
    [Required(ErrorMessage = "Vui lòng nhập nội dung bình luận."), StringLength(2000, ErrorMessage = "Bình luận không được quá 2000 ký tự.")] public string Content { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    [StringLength(300)] public string? ImageUrl { get; set; }
    [StringLength(300)] public string? VideoUrl { get; set; }
    public int PostId { get; set; }
    public Post Post { get; set; } = null!;
    public int UserId { get; set; }
    public AppUser User { get; set; } = null!;
}

public sealed class PostLike
{
    public int Id { get; set; }
    public int PostId { get; set; }
    public Post Post { get; set; } = null!;
    public int UserId { get; set; }
    public AppUser User { get; set; } = null!;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public sealed class UserFollow
{
    public int Id { get; set; }
    public int FollowerId { get; set; }
    public AppUser Follower { get; set; } = null!;
    public int FollowingId { get; set; }
    public AppUser Following { get; set; } = null!;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public sealed class PostReport
{
    public int Id { get; set; }
    [Required, StringLength(500)] public string Reason { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsResolved { get; set; }
    public DateTime? ResolvedAt { get; set; }
    public int PostId { get; set; }
    public Post Post { get; set; } = null!;
    public int UserId { get; set; }
    public AppUser User { get; set; } = null!;
}
