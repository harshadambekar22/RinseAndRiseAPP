# Build: restore + publish a self-contained Release build.
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY RinseRise.Api.csproj ./
RUN dotnet restore
COPY . .
RUN dotnet publish -c Release -o /app --no-restore

# Run: smaller ASP.NET-only runtime image.
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app .

# The SQLite file (ConnectionStrings:Default) and uploads dir (Uploads:Directory)
# both default to paths on the container's writable layer, which Railway wipes
# on every redeploy. Mount a Railway Volume and point ConnectionStrings__Default
# and Uploads__Directory (env vars) at paths under it to persist data across
# deploys — see README "Deploy to Railway".
ENV ASPNETCORE_ENVIRONMENT=Production
EXPOSE 8080
ENTRYPOINT ["dotnet", "RinseRise.Api.dll"]
