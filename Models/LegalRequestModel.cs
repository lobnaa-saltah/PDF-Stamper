namespace LegalRequestForm.Models;

public class LegalRequestModel
{
    public string TransactionType { get; set; } = "outgoing";
    public string TransactionNumber { get; set; } = "211";
    public string TransactionDate { get; set; } = string.Empty;
    public string Attachments { get; set; } = "بدون";
    public string Branch { get; set; } = "فرع منطقة حائل";
}
