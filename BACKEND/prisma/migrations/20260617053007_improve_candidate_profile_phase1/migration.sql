-- AlterTable
ALTER TABLE "educations" ADD COLUMN     "description" TEXT,
ADD COLUMN     "education_type" TEXT NOT NULL DEFAULT 'FORMAL',
ADD COLUMN     "formation_level" TEXT;

-- AlterTable
ALTER TABLE "experiences" ADD COLUMN     "achievements" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "contract_type" TEXT,
ADD COLUMN     "functions" TEXT,
ADD COLUMN     "learned_skills" TEXT[],
ADD COLUMN     "tools" TEXT,
ADD COLUMN     "work_mode" TEXT;

-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "show_city" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "show_education" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "show_experience" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "show_github" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "show_linkedin" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "show_phone" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "show_projects" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "show_skills" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "show_website" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "end_date" TIMESTAMP(3),
ADD COLUMN     "project_type" TEXT,
ADD COLUMN     "responsibilities" TEXT,
ADD COLUMN     "role" TEXT,
ADD COLUMN     "start_date" TIMESTAMP(3),
ADD COLUMN     "status" TEXT;

-- CreateTable
CREATE TABLE "profile_views" (
    "id" SERIAL NOT NULL,
    "profile_id" INTEGER NOT NULL,
    "company_user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profile_views_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "profile_views" ADD CONSTRAINT "profile_views_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_views" ADD CONSTRAINT "profile_views_company_user_id_fkey" FOREIGN KEY ("company_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
