using System.ComponentModel.DataAnnotations;

namespace NongKyCommunity.Web.Models;

public sealed class RegisterViewModel
{
    [Required(ErrorMessage = "Vui lòng nhập họ và tên."), Display(Name = "Họ và tên")] public string FullName { get; set; } = string.Empty;
    [Required(ErrorMessage = "Vui lòng nhập email."), EmailAddress(ErrorMessage = "Email không đúng định dạng."), Display(Name = "Email")] public string Email { get; set; } = string.Empty;
    [Required(ErrorMessage = "Vui lòng nhập mật khẩu."), DataType(DataType.Password), MinLength(8, ErrorMessage = "Mật khẩu phải có ít nhất 8 ký tự."), Display(Name = "Mật khẩu")] public string Password { get; set; } = string.Empty;
}

public sealed class LoginViewModel
{
    [Required(ErrorMessage = "Vui lòng nhập email."), EmailAddress(ErrorMessage = "Email không đúng định dạng."), Display(Name = "Email")] public string Email { get; set; } = string.Empty;
    [Required(ErrorMessage = "Vui lòng nhập mật khẩu."), DataType(DataType.Password), Display(Name = "Mật khẩu")] public string Password { get; set; } = string.Empty;
}
