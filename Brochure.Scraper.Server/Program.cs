WebApplicationBuilder builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddOpenApi();

builder.Services.AddSingleton<HttpClient>();
builder.Services.AddKeyedSingleton<IScraper, KauflandScraper>(ScraperType.Kaufland);
builder.Services.AddKeyedSingleton<IScraper, LidlScraper>(ScraperType.Lidl);
builder.Services.AddKeyedSingleton<IScraper, BillaScraper>(ScraperType.Billa);
builder.Services.AddKeyedSingleton<IScraper, MetroScraper>(ScraperType.Metro);
builder.Services.AddKeyedSingleton<IScraper, FantasticoScraper>(ScraperType.Fantastico);
builder.Services.AddSingleton<ProductsAggregator>();

int exitCode = Microsoft.Playwright.Program.Main(["install", "--with-deps"]);
if (exitCode != 0)
{
    throw new Exception($"Playwright browser installation failed with exit code {exitCode}");
}

await using WebApplication app = builder.Build();

ProductsAggregator productsAggregator = app.Services.GetRequiredService<ProductsAggregator>();
_ = productsAggregator.AggregateAsync();

app.UseDefaultFiles();
app.MapStaticAssets();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference(options =>
    {
        options.WithTitle("Brochure Scraper")
               .WithTheme(ScalarTheme.Mars)
               .WithDefaultHttpClient(ScalarTarget.CSharp, ScalarClient.HttpClient);
    });
}

app.UseHttpsRedirection();
app.UseAuthorization();

app.MapControllers();
app.MapFallbackToFile("/index.html");

ProcessStartInfo scalar = new("https://localhost:7258/scalar/v1")
{
    UseShellExecute = true,
    Verb = "open"
};
ProcessStartInfo frontend = new("https://localhost:54914/")
{
    UseShellExecute = true,
    Verb = "open"
};
Process.Start(scalar);
Process.Start(frontend);

await app.RunAsync();
