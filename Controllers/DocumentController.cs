using LegalRequestForm.Services;
using Microsoft.AspNetCore.Mvc;

namespace LegalRequestForm.Controllers;

[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class DocumentController : ControllerBase
{
    private readonly IPdfProcessingService _pdfService;
    private readonly ILogger<DocumentController> _logger;

    public DocumentController(IPdfProcessingService pdfService, ILogger<DocumentController> logger)
    {
        _pdfService = pdfService ?? throw new ArgumentNullException(nameof(pdfService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    [HttpPost("render-pages")]
    [RequestSizeLimit(100 * 1024 * 1024)]
    [ProducesResponseType(typeof(RenderResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> RenderPages(
        [FromForm] IFormFile? file,
        [FromForm] bool shiftContent = true,
        [FromForm] double headerShift = 180.0,
        [FromForm] int targetPageIndex = 0,
        CancellationToken cancellationToken = default)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new RenderResultDto
            {
                Success = false,
                ErrorMessage = "يرجى اختيار ملف PDF صالح."
            });
        }

        if (!file.FileName.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase) && file.ContentType != "application/pdf")
        {
            return BadRequest(new RenderResultDto
            {
                Success = false,
                ErrorMessage = "الملف المرفوع ليس ملف PDF صالح."
            });
        }

        try
        {
            await using var stream = file.OpenReadStream();
            var result = await _pdfService.RenderPagesAsync(stream, shiftContent, headerShift, targetPageIndex, cancellationToken);

            if (!result.Success)
            {
                return BadRequest(result);
            }

            return Ok(result);
        }
        catch (OperationCanceledException)
        {
            _logger.LogInformation("RenderPages request was cancelled by the client.");
            return StatusCode(StatusCodes.Status499ClientClosedRequest, new { success = false, errorMessage = "تم إلغاء الطلب." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error rendering PDF pages for file: {FileName}", file.FileName);
            return StatusCode(StatusCodes.Status500InternalServerError, new RenderResultDto
            {
                Success = false,
                ErrorMessage = $"حدث خطأ غير متوقع أثناء معالجة المستند: {ex.Message}"
            });
        }
    }

    [HttpPost("stamp-barcode")]
    [RequestSizeLimit(100 * 1024 * 1024)]
    [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> StampBarcode(
        [FromForm] IFormFile? file,
        [FromForm] string? stickerBase64,
        [FromForm] int pageIndex = 0,
        [FromForm] double x = 20,
        [FromForm] double y = 20,
        [FromForm] double width = 250,
        [FromForm] double height = 190,
        [FromForm] bool shiftContent = true,
        [FromForm] double headerShift = 180.0,
        CancellationToken cancellationToken = default)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new { success = false, errorMessage = "يرجى إرفاق ملف PDF الأصلي." });
        }

        if (string.IsNullOrWhiteSpace(stickerBase64))
        {
            return BadRequest(new { success = false, errorMessage = "بيانات صورة الملصق مفقودة." });
        }

        byte[] stickerBytes;
        try
        {
            string cleanBase64 = stickerBase64;
            int commaIndex = cleanBase64.IndexOf(',');
            if (commaIndex >= 0)
            {
                cleanBase64 = cleanBase64.Substring(commaIndex + 1);
            }
            stickerBytes = Convert.FromBase64String(cleanBase64);
        }
        catch (FormatException)
        {
            return BadRequest(new { success = false, errorMessage = "صيغة صورة الملصق (Base64) غير صالحة." });
        }

        try
        {
            await using var pdfStream = file.OpenReadStream();
            byte[] stampedPdf = await _pdfService.StampBarcodeAsync(
                pdfStream,
                stickerBytes,
                pageIndex,
                x,
                y,
                width,
                height,
                shiftContent,
                headerShift,
                cancellationToken);

            string originalName = Path.GetFileNameWithoutExtension(file.FileName);
            string downloadName = $"{originalName}_stamped.pdf";

            return File(stampedPdf, "application/pdf", downloadName);
        }
        catch (OperationCanceledException)
        {
            _logger.LogInformation("StampBarcode request was cancelled by the client.");
            return StatusCode(StatusCodes.Status499ClientClosedRequest, new { success = false, errorMessage = "تم إلغاء الطلب." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error stamping barcode onto PDF file: {FileName}", file.FileName);
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                success = false,
                errorMessage = $"حدث خطأ أثناء تثبيت الملصق على الـ PDF: {ex.Message}"
            });
        }
    }
}
