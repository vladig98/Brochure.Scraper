WebApplicationBuilder builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddOpenApi();

builder.Services.AddSingleton<HttpClient>();
builder.Services.AddKeyedScoped<IScraper, KauflandScraper>(ScraperType.Kaufland);
builder.Services.AddKeyedScoped<IScraper, LidlScraper>(ScraperType.Lidl);
builder.Services.AddKeyedScoped<IScraper, BillaScraper>(ScraperType.Billa);
builder.Services.AddKeyedScoped<IScraper, MetroScraper>(ScraperType.Metro);
builder.Services.AddKeyedScoped<IScraper, FantasticoScraper>(ScraperType.Fantastico);
builder.Services.AddScoped<ProductsFilterService>();

int exitCode = Microsoft.Playwright.Program.Main(["install"]);
if (exitCode != 0)
{
    throw new Exception($"Playwright browser installation failed with exit code {exitCode}");
}

await using WebApplication app = builder.Build();

app.UseDefaultFiles();
app.MapStaticAssets();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseAuthorization();

app.MapControllers();
app.MapFallbackToFile("/index.html");

await app.RunAsync();
