using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.EntityFrameworkCore;
using NongKyCommunity.Web.Data;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllersWithViews();
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));
builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options => options.LoginPath = "/Account/Login");
builder.Services.AddAuthorization();

var app = builder.Build();
using (var scope = app.Services.CreateScope())
{
    var database = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await database.Database.EnsureCreatedAsync();
    await SchemaMigrator.ApplyAsync(database);
    await database.Database.ExecuteSqlRawAsync("IF COL_LENGTH('dbo.Users', 'Role') IS NULL ALTER TABLE dbo.Users ADD Role nvarchar(20) NOT NULL CONSTRAINT DF_Users_Role DEFAULT 'User'");
    await CommunitySeed.SeedAsync(database);
    if (!await database.Categories.AnyAsync(category => category.Slug == "thong-bao"))
    {
        database.Categories.Add(new NongKyCommunity.Web.Models.Category { Name = "Thông báo", Slug = "thong-bao" });
        await database.SaveChangesAsync();
    }
    if (!await database.Categories.AnyAsync())
    {
        database.Categories.AddRange(
            new NongKyCommunity.Web.Models.Category { Name = "Trồng trọt", Slug = "trong-trot" },
            new NongKyCommunity.Web.Models.Category { Name = "Chăn nuôi", Slug = "chan-nuoi" },
            new NongKyCommunity.Web.Models.Category { Name = "Kinh nghiệm nhà nông", Slug = "kinh-nghiem-nha-nong" });
        await database.SaveChangesAsync();
    }
}

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();

app.UseRouting();

app.UseAuthentication();

app.UseAuthorization();

app.UseAuthorization();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

app.Run();
