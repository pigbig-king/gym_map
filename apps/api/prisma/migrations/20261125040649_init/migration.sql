-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "GymStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nickname" TEXT,
    "avatarUrl" TEXT,
    "bio" TEXT,
    "height" DOUBLE PRECISION,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "actorId" TEXT,
    "targetType" TEXT,
    "targetId" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Gym" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "district" TEXT,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "environment" TEXT,
    "price" TEXT,
    "hours" TEXT,
    "phone" TEXT,
    "images" TEXT[],
    "status" "GymStatus" NOT NULL DEFAULT 'PENDING',
    "submittedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Gym_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymEquipment" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "professionalName" TEXT,
    "serialLabel" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'NORMAL',

    CONSTRAINT "GymEquipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymEquipmentReview" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GymEquipmentReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymCheckIn" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GymCheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymReview" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GymReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_nickname_key" ON "User"("nickname");

-- CreateIndex
CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", "read");

-- CreateIndex
CREATE INDEX "Gym_city_district_idx" ON "Gym"("city", "district");

-- CreateIndex
CREATE INDEX "Gym_status_idx" ON "Gym"("status");

-- CreateIndex
CREATE UNIQUE INDEX "GymEquipmentReview_equipmentId_userId_key" ON "GymEquipmentReview"("equipmentId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "GymCheckIn_gymId_userId_date_key" ON "GymCheckIn"("gymId", "userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "GymReview_gymId_userId_key" ON "GymReview"("gymId", "userId");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gym" ADD CONSTRAINT "Gym_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymEquipment" ADD CONSTRAINT "GymEquipment_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymEquipmentReview" ADD CONSTRAINT "GymEquipmentReview_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "GymEquipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymEquipmentReview" ADD CONSTRAINT "GymEquipmentReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymCheckIn" ADD CONSTRAINT "GymCheckIn_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymCheckIn" ADD CONSTRAINT "GymCheckIn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymReview" ADD CONSTRAINT "GymReview_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymReview" ADD CONSTRAINT "GymReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
