using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using WebApplication2.Areas.Identity.Data;

namespace WebApplication2.Areas.Identity.Pages.Account
{
    public class LoginWithPasskeyModel : PageModel
    {
        private readonly SignInManager<ApplicationUser> _signInManager;

        public string? UserEmail { get; set; }

        public LoginWithPasskeyModel(SignInManager<ApplicationUser> signInManager)
        {
            _signInManager = signInManager;
        }

        public async Task<IActionResult> OnGet()
        {
            return Page();
        }
    }
}
