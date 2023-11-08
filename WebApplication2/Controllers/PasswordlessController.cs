using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System.Security.Claims;
using WebApplication2.Areas.Identity.Data;
using WebApplication2.Data;
using WebApplication2.ViewModels;

namespace WebApplication2.Controllers
{
    public class PasswordlessController : Controller
    {
        private readonly string API_SECRET = Environment.GetEnvironmentVariable("PASSWORDLESS_APISECRET"); // Replace with your API secret
        private readonly HttpClient _httpClient;

        private readonly SignInManager<ApplicationUser> _signInManager;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly ApplicationDbContext _context;

        public PasswordlessController(SignInManager<ApplicationUser> signInManager, UserManager<ApplicationUser> userManager, ApplicationDbContext context)
        {
            _signInManager = signInManager;
            _userManager = userManager;
            _context = context;

            _httpClient = new HttpClient();
            _httpClient.BaseAddress = new Uri("http://localhost:7001");
            _httpClient.DefaultRequestHeaders.Add("ApiSecret", API_SECRET);

            if (API_SECRET == "<YOUR_API_SECRET>") throw new InvalidOperationException("Please set your API SECRET");
        }

        // https://docs.passwordless.dev/guide/api.html#register-token
        public async Task<IActionResult> GetRegisterToken()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            ApplicationUser? user = await _context.Users.FindAsync(userId);

            // We don't want to register a device if the ApplicationUser isn't found or already has a device registered
            if (user == null || user.PasskeySecurityEnabled)
            {
                return BadRequest();
            }

            // Within the AdminConsole, users that have registered their authenticator will show up in a list
            // The alias is used to identify the user. It can be anything (a name, email adress, etc.)
            string? alias = User.FindFirstValue(ClaimTypes.Name);

            // For development purposes, alias hashing will be turned off
            // This may be enabled in production to hide the username (which in this case is just the user's email adress)
            var payload = new
            {
                userId,
                username = alias,
                Aliases = new[] { alias },
                aliasHashing = false
            };

            // Send a request to the passwordless API to retrieve a registration token
            var request = await _httpClient.PostAsJsonAsync("register/token", payload);

            if (request.IsSuccessStatusCode)
            {
                string? jsonString = request.Content.ReadAsStringAsync().Result;
                JObject json = JObject.Parse(jsonString);
                string? tokenStr = json.Value<string>("token");

                user.PasskeySecurityEnabled = true;
                await _context.SaveChangesAsync();
                return Ok(tokenStr); // Pass the token to the JavaScript in passwordless-register.js
            }

            // Handle or log any API error
            var error = await request.Content.ReadFromJsonAsync<ProblemDetails>();
            return new JsonResult(error)
            {
                StatusCode = (int)request.StatusCode
            };
        }

        [Produces("application/json")]
        [HttpPost]
        public async Task<IActionResult> SignIn([FromBody] PasskeySigninViewModel viewModel)
        {
            if (viewModel.Token == null) return BadRequest("No sign in verification token was provided.");

            // Send the registration token to the API and verify the login
            var payload = new { token = viewModel.Token };
            var response = await _httpClient.PostAsJsonAsync("/signin/verify", payload);

            try
            {
                string responseBody = await response.Content.ReadAsStringAsync();
                JObject json = JObject.Parse(responseBody);
                bool success = (bool)json["success"];
                string userId = (string)json["userId"];

                ApplicationUser? user = await _context.Users.FindAsync(userId);
                if (user != null && success)
                {
                    await _signInManager.SignInAsync(user, true);
                    return StatusCode(StatusCodes.Status200OK, "Succesful signin.");
                }
                
                return BadRequest("Something went wrong.");
            }
            catch (Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, "An error occured when trying to proces the login request.");
            }
        }
    }
}
