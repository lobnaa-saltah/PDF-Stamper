using System.Runtime.InteropServices;
using Docnet.Core;
using Docnet.Core.Models;
using PdfSharpCore.Drawing;
using PdfSharpCore.Pdf.IO;
using SkiaSharp;

namespace LegalRequestForm.Services;

public class RenderedPageDto
{
    public int PageIndex { get; set; }
    public int PixelWidth { get; set; }
    public int PixelHeight { get; set; }
    public double PointWidth { get; set; }
    public double PointHeight { get; set; }
    public string ImageBase64 { get; set; } = string.Empty;
}

public class RenderResultDto
{
    public bool Success { get; set; }
    public int PageCount { get; set; }
    public List<RenderedPageDto> Pages { get; set; } = new();
    public string? ErrorMessage { get; set; }
}

public interface IPdfProcessingService
{
    Task<RenderResultDto> RenderPagesAsync(
        Stream pdfStream,
        bool shiftContentForSticker = true,
        double headerShift = 180.0,
        int targetPageIndex = 0,
        CancellationToken cancellationToken = default);

    Task<byte[]> StampBarcodeAsync(
        Stream pdfStream,
        byte[] stickerPngBytes,
        int pageIndex,
        double x,
        double y,
        double width,
        double height,
        bool shiftContentForSticker = true,
        double headerShift = 180.0,
        CancellationToken cancellationToken = default);
}

public class PdfProcessingService : IPdfProcessingService
{
    private readonly ILogger<PdfProcessingService> _logger;

    public PdfProcessingService(ILogger<PdfProcessingService> logger)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<RenderResultDto> RenderPagesAsync(
        Stream pdfStream,
        bool shiftContentForSticker = true,
        double headerShift = 180.0,
        int targetPageIndex = 0,
        CancellationToken cancellationToken = default)
    {
        try
        {
            using var memoryStream = new MemoryStream();
            await pdfStream.CopyToAsync(memoryStream, cancellationToken);
            byte[] originalPdfBytes = memoryStream.ToArray();

            if (originalPdfBytes.Length == 0)
            {
                return new RenderResultDto { Success = false, ErrorMessage = "الملف فارغ أو غير صالح." };
            }

            byte[] pdfBytes = (shiftContentForSticker && headerShift > 0)
                ? ShiftDocumentContent(originalPdfBytes, targetPageIndex, headerShift)
                : originalPdfBytes;

            cancellationToken.ThrowIfCancellationRequested();

            var pointDimensions = new List<(double Width, double Height)>();
            using (var pdfSharpDoc = PdfReader.Open(new MemoryStream(pdfBytes), PdfDocumentOpenMode.Import))
            {
                for (int i = 0; i < pdfSharpDoc.Pages.Count; i++)
                {
                    pointDimensions.Add((pdfSharpDoc.Pages[i].Width.Point, pdfSharpDoc.Pages[i].Height.Point));
                }
            }

            var pages = new List<RenderedPageDto>();
            using (var docReader = DocLib.Instance.GetDocReader(pdfBytes, new PageDimensions(2.0)))
            {
                int pageCount = docReader.GetPageCount();

                for (int i = 0; i < pageCount; i++)
                {
                    cancellationToken.ThrowIfCancellationRequested();

                    using var pageReader = docReader.GetPageReader(i);
                    int pixelWidth = pageReader.GetPageWidth();
                    int pixelHeight = pageReader.GetPageHeight();
                    byte[] bgraBytes = pageReader.GetImage();

                    byte[] pngBytes = ConvertBgraToPng(bgraBytes, pixelWidth, pixelHeight);
                    string base64Url = "data:image/png;base64," + Convert.ToBase64String(pngBytes);

                    double ptWidth = i < pointDimensions.Count ? pointDimensions[i].Width : (pixelWidth / 2.0);
                    double ptHeight = i < pointDimensions.Count ? pointDimensions[i].Height : (pixelHeight / 2.0);

                    pages.Add(new RenderedPageDto
                    {
                        PageIndex = i,
                        PixelWidth = pixelWidth,
                        PixelHeight = pixelHeight,
                        PointWidth = ptWidth,
                        PointHeight = ptHeight,
                        ImageBase64 = base64Url
                    });
                }
            }

            return new RenderResultDto
            {
                Success = true,
                PageCount = pages.Count,
                Pages = pages
            };
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error rendering PDF pages via PDFium engine.");
            return new RenderResultDto
            {
                Success = false,
                ErrorMessage = $"فشل في معالجة ملف الـ PDF: {ex.Message}"
            };
        }
    }

    public async Task<byte[]> StampBarcodeAsync(
        Stream pdfStream,
        byte[] stickerPngBytes,
        int pageIndex,
        double x,
        double y,
        double width,
        double height,
        bool shiftContentForSticker = true,
        double headerShift = 180.0,
        CancellationToken cancellationToken = default)
    {
        try
        {
            using var memoryStream = new MemoryStream();
            await pdfStream.CopyToAsync(memoryStream, cancellationToken);
            byte[] originalPdfBytes = memoryStream.ToArray();

            cancellationToken.ThrowIfCancellationRequested();

            byte[] workingPdfBytes = (shiftContentForSticker && headerShift > 0)
                ? ShiftDocumentContent(originalPdfBytes, pageIndex, headerShift)
                : originalPdfBytes;

            using var outputStream = new MemoryStream();
            using (var document = PdfReader.Open(new MemoryStream(workingPdfBytes), PdfDocumentOpenMode.Modify))
            {
                if (pageIndex < 0 || pageIndex >= document.Pages.Count)
                {
                    pageIndex = 0;
                }

                var page = document.Pages[pageIndex];

                using (var gfx = XGraphics.FromPdfPage(page))
                {
                    var xImage = XImage.FromStream(() => new MemoryStream(stickerPngBytes));
                    gfx.DrawImage(xImage, x, y, width, height);
                }

                document.Save(outputStream, false);
            }

            return outputStream.ToArray();
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error stamping barcode sticker onto PDF.");
            throw;
        }
    }

    private static byte[] ShiftDocumentContent(byte[] pdfBytes, int targetPageIndex, double headerShift)
    {
        if (headerShift <= 0) return pdfBytes;

        try
        {
            using var inStream = new MemoryStream(pdfBytes);
            using var form = XPdfForm.FromStream(inStream);
            using var outDoc = new PdfSharpCore.Pdf.PdfDocument();

            for (int i = 0; i < form.PageCount; i++)
            {
                form.PageIndex = i;
                double w = form.PointWidth;
                double h = form.PointHeight;

                var newPage = outDoc.AddPage();
                newPage.Width = w;
                newPage.Height = h;

                using var gfx = XGraphics.FromPdfPage(newPage);

                if (i == targetPageIndex)
                {
                    double availableH = h - headerShift;
                    if (availableH > 50)
                    {
                        gfx.DrawImage(form, 0, headerShift, w, availableH);
                    }
                    else
                    {
                        gfx.DrawImage(form, 0, 0, w, h);
                    }
                }
                else
                {
                    gfx.DrawImage(form, 0, 0, w, h);
                }
            }

            using var outStream = new MemoryStream();
            outDoc.Save(outStream, false);
            return outStream.ToArray();
        }
        catch
        {
            return pdfBytes;
        }
    }

    private static byte[] ConvertBgraToPng(byte[] bgraBytes, int width, int height)
    {
        var info = new SKImageInfo(width, height, SKColorType.Bgra8888, SKAlphaType.Premul);
        using var bitmap = new SKBitmap();
        var gcHandle = GCHandle.Alloc(bgraBytes, GCHandleType.Pinned);
        try
        {
            bitmap.InstallPixels(info, gcHandle.AddrOfPinnedObject(), info.RowBytes);
            using var image = SKImage.FromBitmap(bitmap);
            using var data = image.Encode(SKEncodedImageFormat.Png, 100);
            return data.ToArray();
        }
        finally
        {
            if (gcHandle.IsAllocated)
            {
                gcHandle.Free();
            }
        }
    }
}
