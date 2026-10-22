using System.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using LegalRequestForm.Models;

namespace LegalRequestForm.Controllers;

public class HomeController : Controller
{
    [HttpGet("/")]
    [HttpGet("/Home")]
    [HttpGet("/Home/Index")]
    [HttpGet("/Home/Editor")]
    public IActionResult Index()
    {
        return View();
    }

    [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
    public IActionResult Error()
    {
        return View(new ErrorViewModel
        {
            RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier
        });
    }
}
