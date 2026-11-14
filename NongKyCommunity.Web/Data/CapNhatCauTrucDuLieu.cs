using Microsoft.EntityFrameworkCore;

namespace NongKyCommunity.Web.Data;

public static class SchemaMigrator
{
    public static Task ApplyAsync(AppDbContext db) => db.Database.ExecuteSqlRawAsync("""
        IF COL_LENGTH('dbo.Users','AvatarUrl') IS NULL ALTER TABLE dbo.Users ADD AvatarUrl nvarchar(200) NULL;
        IF COL_LENGTH('dbo.Users','Bio') IS NULL ALTER TABLE dbo.Users ADD Bio nvarchar(1000) NULL;
        IF COL_LENGTH('dbo.Users','FarmingArea') IS NULL ALTER TABLE dbo.Users ADD FarmingArea nvarchar(150) NULL;
        IF COL_LENGTH('dbo.Users','Experience') IS NULL ALTER TABLE dbo.Users ADD Experience nvarchar(500) NULL;
        IF COL_LENGTH('dbo.Posts','ImageUrl') IS NULL ALTER TABLE dbo.Posts ADD ImageUrl nvarchar(300) NULL;
        IF COL_LENGTH('dbo.Posts','VideoUrl') IS NULL ALTER TABLE dbo.Posts ADD VideoUrl nvarchar(300) NULL;
        IF COL_LENGTH('dbo.Posts','CropId') IS NULL ALTER TABLE dbo.Posts ADD CropId int NULL;
        IF OBJECT_ID('dbo.Crops','U') IS NULL CREATE TABLE dbo.Crops (Id int IDENTITY(1,1) NOT NULL PRIMARY KEY, Name nvarchar(80) NOT NULL, Slug nvarchar(100) NOT NULL, Description nvarchar(500) NULL, IsActive bit NOT NULL DEFAULT 1);
        IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_Crops_Slug' AND object_id=OBJECT_ID('dbo.Crops')) CREATE UNIQUE INDEX IX_Crops_Slug ON dbo.Crops(Slug);
        IF OBJECT_ID('dbo.Comments','U') IS NULL CREATE TABLE dbo.Comments (Id int IDENTITY(1,1) NOT NULL PRIMARY KEY, Content nvarchar(2000) NOT NULL, CreatedAt datetime2 NOT NULL, UpdatedAt datetime2 NULL, PostId int NOT NULL, UserId int NOT NULL, CONSTRAINT FK_Comments_Posts FOREIGN KEY(PostId) REFERENCES dbo.Posts(Id) ON DELETE CASCADE, CONSTRAINT FK_Comments_Users FOREIGN KEY(UserId) REFERENCES dbo.Users(Id));
        IF COL_LENGTH('dbo.Comments','ImageUrl') IS NULL ALTER TABLE dbo.Comments ADD ImageUrl nvarchar(300) NULL;
        IF COL_LENGTH('dbo.Comments','VideoUrl') IS NULL ALTER TABLE dbo.Comments ADD VideoUrl nvarchar(300) NULL;
        IF OBJECT_ID('dbo.PostLikes','U') IS NULL CREATE TABLE dbo.PostLikes (Id int IDENTITY(1,1) NOT NULL PRIMARY KEY, PostId int NOT NULL, UserId int NOT NULL, CreatedAt datetime2 NOT NULL, CONSTRAINT FK_PostLikes_Posts FOREIGN KEY(PostId) REFERENCES dbo.Posts(Id) ON DELETE CASCADE, CONSTRAINT FK_PostLikes_Users FOREIGN KEY(UserId) REFERENCES dbo.Users(Id), CONSTRAINT UQ_PostLikes_Post_User UNIQUE(PostId, UserId));
        IF OBJECT_ID('dbo.UserFollows','U') IS NULL CREATE TABLE dbo.UserFollows (Id int IDENTITY(1,1) NOT NULL PRIMARY KEY, FollowerId int NOT NULL, FollowingId int NOT NULL, CreatedAt datetime2 NOT NULL, CONSTRAINT FK_UserFollows_Follower FOREIGN KEY(FollowerId) REFERENCES dbo.Users(Id), CONSTRAINT FK_UserFollows_Following FOREIGN KEY(FollowingId) REFERENCES dbo.Users(Id), CONSTRAINT UQ_UserFollows_Follower_Following UNIQUE(FollowerId, FollowingId));
        IF OBJECT_ID('dbo.PostReports','U') IS NULL CREATE TABLE dbo.PostReports (Id int IDENTITY(1,1) NOT NULL PRIMARY KEY, Reason nvarchar(500) NOT NULL, CreatedAt datetime2 NOT NULL, IsResolved bit NOT NULL DEFAULT 0, ResolvedAt datetime2 NULL, PostId int NOT NULL, UserId int NOT NULL, CONSTRAINT FK_PostReports_Posts FOREIGN KEY(PostId) REFERENCES dbo.Posts(Id) ON DELETE CASCADE, CONSTRAINT FK_PostReports_Users FOREIGN KEY(UserId) REFERENCES dbo.Users(Id));
        IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_PostReports_Post_Resolved' AND object_id=OBJECT_ID('dbo.PostReports')) CREATE INDEX IX_PostReports_Post_Resolved ON dbo.PostReports(PostId, IsResolved);
        IF EXISTS (SELECT 1 FROM dbo.Categories WHERE Name = N'Kinh nghiệm') AND EXISTS (SELECT 1 FROM dbo.Categories WHERE Name = N'Kinh nghiệm nhà nông')
        BEGIN
            UPDATE dbo.Posts SET CategoryId = (SELECT TOP 1 Id FROM dbo.Categories WHERE Name = N'Kinh nghiệm nhà nông') WHERE CategoryId IN (SELECT Id FROM dbo.Categories WHERE Name = N'Kinh nghiệm');
            DELETE FROM dbo.Categories WHERE Name = N'Kinh nghiệm';
        END;
        IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name='FK_Posts_Crops') ALTER TABLE dbo.Posts ADD CONSTRAINT FK_Posts_Crops FOREIGN KEY(CropId) REFERENCES dbo.Crops(Id) ON DELETE SET NULL;
        """);
}
