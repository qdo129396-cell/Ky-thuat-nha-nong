using System.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using NongKyCommunity.Web.Models;

namespace NongKyCommunity.Web.Controllers;

public class HomeController : Controller
{
    private readonly ILogger<HomeController> _logger;

    public HomeController(ILogger<HomeController> logger)
    {
        _logger = logger;
    }

    public IActionResult Index()
    {
        return View("~/Views/Home/TrangChu.cshtml");
    }

    public IActionResult Privacy()
    {
        return View("~/Views/Home/GioiThieu.cshtml");
    }

    [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
    public IActionResult Error()
    {
        return View("~/Views/Shared/TrangLoi.cshtml", new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
    }
}
