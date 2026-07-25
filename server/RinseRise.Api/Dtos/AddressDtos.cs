using System.ComponentModel.DataAnnotations;

namespace RinseRise.Api.Dtos;

public record AddressDto(
    int Id, string Label, string Line1, string? Line2,
    string City, string State, string Pincode, double Latitude, double Longitude);

public record AddressUpsertDto(
    [Required] string Label,
    [Required] string Line1,
    string? Line2,
    string City, string State, string Pincode,
    double Latitude, double Longitude);
