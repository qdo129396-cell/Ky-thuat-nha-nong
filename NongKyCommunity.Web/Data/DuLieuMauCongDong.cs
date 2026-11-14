using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using NongKyCommunity.Web.Models;

namespace NongKyCommunity.Web.Data;

public static class CommunitySeed
{
    public static async Task SeedAsync(AppDbContext db)
    {
        const string adminEmail = "admin@kythuatnhanong.vn";
        if (!await db.Users.AnyAsync(user => user.Email == adminEmail))
        {
            var admin = new AppUser { FullName = "Quản trị viên", Email = adminEmail, Role = UserRole.Admin };
            admin.PasswordHash = new PasswordHasher<AppUser>().HashPassword(admin, "Admin@123");
            db.Users.Add(admin);
            await db.SaveChangesAsync();
        }
        var data = new Dictionary<string, string[]> {
            ["Trồng trọt"] = ["Kỹ thuật trồng cà chua cho năng suất cao","Cách cải tạo đất trước khi gieo trồng","Hướng dẫn trồng rau sạch tại nhà","Cách bón phân đúng thời điểm","Kỹ thuật gieo hạt giúp cây nảy mầm đều","Chăm sóc rau trong mùa mưa","Luân canh cây trồng giúp cải thiện đất","Nhận biết cây trồng thiếu dinh dưỡng","Kỹ thuật trồng khoai tây","Những sai lầm thường gặp khi trồng rau"],
            ["Chăn nuôi"] = ["Kỹ thuật nuôi gà thả vườn khỏe mạnh","Cách chọn con giống heo chất lượng","Chăm sóc bò thịt mùa nắng nóng","Phối trộn thức ăn cho vật nuôi","Thiết kế chuồng trại thông thoáng","Phòng bệnh hô hấp cho đàn gà","Vệ sinh chuồng trại đúng cách","An toàn sinh học trong chăn nuôi","Dấu hiệu vật nuôi bỏ ăn","Giảm chi phí thức ăn chăn nuôi"],
            ["Sâu bệnh"] = ["Xử lý rệp sáp trên cây trồng","Phòng trừ sâu ăn lá sinh học","Quản lý sâu đục thân hiệu quả","Dấu hiệu vàng lá và cách khắc phục","Xử lý bệnh thối rễ mùa mưa","Nhận biết nấm bệnh trên rau màu","Sử dụng thuốc sinh học an toàn","Quản lý dịch hại tổng hợp IPM","Theo dõi sâu bệnh định kỳ","Bảo vệ thiên địch trong vườn"],
            ["Tưới tiêu"] = ["Lắp đặt tưới nhỏ giọt cho vườn rau","Ưu điểm hệ thống tưới phun mưa","Chọn máy bơm nước phù hợp","Kiểm tra độ ẩm đất trước khi tưới","Tưới tự động tiết kiệm công sức","Kỹ thuật tưới tiết kiệm nước mùa khô","Lịch tưới cho cây ăn quả","Bảo dưỡng đường ống tưới định kỳ","Xử lý tắc đầu tưới nhỏ giọt","Thu gom nước mưa phục vụ sản xuất"],
            ["Máy móc"] = ["Chọn máy cày phù hợp diện tích ruộng","Sử dụng máy xới đất an toàn","Bảo dưỡng máy cắt cỏ sau mùa vụ","Vận hành máy phun thuốc đúng kỹ thuật","Kiểm tra máy bơm trước khi sử dụng","Thay nhớt máy nông nghiệp định kỳ","An toàn khi làm việc với máy móc","Vệ sinh máy sau khi làm ruộng","Kinh nghiệm mua máy nông nghiệp cũ","Bảo quản máy móc trong mùa mưa"],
            ["Kinh nghiệm nhà nông"] = ["Chọn giống theo vùng đất","Lập kế hoạch mùa vụ hiệu quả","Giảm chi phí đầu vào sản xuất","Bảo quản nông sản sau thu hoạch","Theo dõi thời tiết chủ động canh tác","Ghi chép sản xuất tăng năng suất","Bán nông sản đúng thời điểm","Tận dụng phụ phẩm nông nghiệp","Kiểm tra vườn mỗi ngày","Học hỏi từ cộng đồng nhà nông"] };
        foreach (var name in data.Keys) if (!await db.Categories.AnyAsync(c => c.Name == name)) db.Categories.Add(new Category { Name = name, Slug = Slug(name) });
        await db.SaveChangesAsync();
        const string email = "congdong@kythuatnhanong.vn";
        var author = await db.Users.SingleOrDefaultAsync(u => u.Email == email);
        if (author is null) { author = new AppUser { FullName = "Cộng đồng Kỹ Thuật Nhà Nông", Email = email, PasswordHash = "seed-only", Role = UserRole.User }; db.Users.Add(author); await db.SaveChangesAsync(); }
        if (await db.Posts.AnyAsync(p => p.AuthorId == author.Id)) return;
        var index = 0;
        foreach (var (name, titles) in data) { var category = await db.Categories.SingleAsync(c => c.Name == name); foreach (var title in titles) { db.Posts.Add(new Post { Title = title, Slug = Slug(title), Excerpt = $"Kinh nghiệm thực tế về {title.ToLowerInvariant()} dành cho bà con nhà nông.", Content = $"Chuẩn bị\nKhảo sát điều kiện sản xuất, dụng cụ và thời tiết trước khi thực hiện.\n\nCách thực hiện\nÁp dụng từng bước phù hợp với quy mô hộ gia đình và theo dõi kết quả.\n\nChăm sóc\nKiểm tra định kỳ, điều chỉnh nước, dinh dưỡng và môi trường kịp thời.\n\nNhững điều cần lưu ý\nƯu tiên an toàn, ghi chép chi phí và không áp dụng máy móc khi điều kiện khác nhau.\n\nKinh nghiệm thực tế\nTrao đổi với cộng đồng để rút kinh nghiệm và chọn giải pháp hiệu quả.", IsPublished = true, CreatedAt = DateTime.UtcNow.AddDays(-index++), AuthorId = author.Id, CategoryId = category.Id }); } }
        await db.SaveChangesAsync();
    }
    private static string Slug(string value) => string.Concat(value.Normalize(System.Text.NormalizationForm.FormD).Where(c => System.Globalization.CharUnicodeInfo.GetUnicodeCategory(c) != System.Globalization.UnicodeCategory.NonSpacingMark).Select(c => char.IsLetterOrDigit(c) ? char.ToLowerInvariant(c) : '-')).Trim('-').Replace('đ', 'd');
}
