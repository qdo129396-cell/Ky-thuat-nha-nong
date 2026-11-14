using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NongKyCommunity.Web.Data;
using NongKyCommunity.Web.Models;

namespace NongKyCommunity.Web.Controllers;

public sealed class AccountController(AppDbContext database) : Controller
{
    private static readonly PasswordHasher<AppUser> PasswordHasher = new();

    [HttpGet] public IActionResult Register() => View("~/Views/Account/DangKy.cshtml");

    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> Register(RegisterViewModel model)
    {
        if (!ModelState.IsValid) return View("~/Views/Account/DangKy.cshtml", model);
        var email = model.Email.Trim().ToLowerInvariant();
        if (await database.Users.AnyAsync(item => item.Email == email))
        {
            ModelState.AddModelError(nameof(model.Email), "Email đã được sử dụng.");
            return View("~/Views/Account/DangKy.cshtml", model);
        }
        var user = new AppUser { FullName = model.FullName.Trim(), Email = email, Role = UserRole.User };
        user.PasswordHash = PasswordHasher.HashPassword(user, model.Password);
        database.Users.Add(user);
        await database.SaveChangesAsync();
        await SignInAsync(user);
        return RedirectToAction("Index", "Posts");
    }

    [HttpGet] public IActionResult Login() => View("~/Views/Account/DangNhap.cshtml");

    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> Login(LoginViewModel model)
    {
        if (!ModelState.IsValid) return View("~/Views/Account/DangNhap.cshtml", model);
        var user = await database.Users.SingleOrDefaultAsync(item => item.Email == model.Email.Trim().ToLowerInvariant());
        if (user is null || PasswordHasher.VerifyHashedPassword(user, user.PasswordHash, model.Password) == PasswordVerificationResult.Failed)
        {
            ModelState.AddModelError(string.Empty, "Email hoặc mật khẩu không đúng.");
            return View("~/Views/Account/DangNhap.cshtml", model);
        }
        await SignInAsync(user);
        return RedirectToAction("Index", "Posts");
    }

    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return RedirectToAction("Index", "Home");
    }

    private Task SignInAsync(AppUser user)
    {
        var identity = new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.FullName),
            new Claim(ClaimTypes.Role, user.Role.ToString())
        ], CookieAuthenticationDefaults.AuthenticationScheme);
        return HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, new ClaimsPrincipal(identity));
    }
}
