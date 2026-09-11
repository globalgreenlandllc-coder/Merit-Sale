-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "dob" TIMESTAMP(3),
    "legalName" TEXT,
    "residenceState" TEXT,
    "residenceAddress" TEXT,
    "role" TEXT NOT NULL DEFAULT 'registrant',
    "idvVendorRef" TEXT,
    "idvStatus" TEXT NOT NULL DEFAULT 'none',
    "idvVerifiedAt" TIMESTAMP(3),
    "idvLevel" TEXT,
    "sanctionsStatus" TEXT NOT NULL DEFAULT 'none',
    "sanctionsCheckedAt" TIMESTAMP(3),
    "deviceFingerprintsJson" TEXT NOT NULL DEFAULT '[]',
    "priorWinner" BOOLEAN NOT NULL DEFAULT false,
    "excludedReason" TEXT,
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "speEntityId" TEXT,
    "speEntityName" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zip" TEXT,
    "legalDescription" TEXT,
    "countyRecorderRef" TEXT,
    "countyRecorderUrl" TEXT,
    "deedRecordedAt" TIMESTAMP(3),
    "titleStatus" TEXT NOT NULL DEFAULT 'under_option',
    "liensJson" TEXT NOT NULL DEFAULT '[]',
    "includedItemsJson" TEXT NOT NULL DEFAULT '[]',
    "excludedItemsJson" TEXT NOT NULL DEFAULT '[]',
    "appraisedValueCents" INTEGER,
    "appraisalDate" TIMESTAMP(3),
    "appraiserName" TEXT,
    "photosJson" TEXT NOT NULL DEFAULT '[]',
    "disclosuresPackUrl" TEXT,
    "beds" INTEGER,
    "baths" DOUBLE PRECISION,
    "sqft" INTEGER,
    "lotSqft" INTEGER,
    "yearBuilt" INTEGER,
    "stories" INTEGER,
    "garageSpaces" INTEGER,
    "heating" TEXT,
    "cooling" TEXT,
    "roof" TEXT,
    "exterior" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "county" TEXT,
    "parcelNumber" TEXT,
    "schoolDistrict" TEXT,
    "zoning" TEXT,
    "taxAnnualCents" INTEGER,
    "insuranceAnnualCents" INTEGER,
    "hoaMonthlyCents" INTEGER,
    "utilitiesMonthlyCents" INTEGER,
    "planSetKey" TEXT,
    "appraisalReportUrl" TEXT,
    "factsApprovedAt" TIMESTAMP(3),
    "anchorsJson" TEXT NOT NULL DEFAULT '[]',
    "propertyType" TEXT,
    "waterSource" TEXT,
    "sewer" TEXT,
    "floodZone" TEXT,
    "foundation" TEXT,
    "lotDimensions" TEXT,
    "parking" TEXT,
    "fireplaces" INTEGER,
    "nearbyJson" TEXT NOT NULL DEFAULT '[]',
    "historyJson" TEXT NOT NULL DEFAULT '[]',
    "description" TEXT,
    "neighborhood" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeritOpen" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "listingNo" TEXT,
    "propertyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "isPractice" BOOLEAN NOT NULL DEFAULT false,
    "stateEligibilityJson" TEXT NOT NULL DEFAULT '[]',
    "registrationFeeCents" INTEGER NOT NULL,
    "cashComponentCents" INTEGER NOT NULL,
    "reservationTarget" INTEGER,
    "showReservationCount" BOOLEAN NOT NULL DEFAULT true,
    "registrationOpenAt" TIMESTAMP(3),
    "registrationCloseAt" TIMESTAMP(3),
    "firstAccessHours" INTEGER NOT NULL DEFAULT 72,
    "advanceN" INTEGER NOT NULL,
    "advanceM" INTEGER NOT NULL,
    "rulesVersion" TEXT,
    "rulesHash" TEXT,
    "lockedAt" TIMESTAMP(3),
    "lockedById" TEXT,
    "titleOverrideJustification" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "cancellationReasonCode" TEXT,
    "cancellationNote" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "winnerRegistrationId" TEXT,
    "winnerConsentToPublish" BOOLEAN NOT NULL DEFAULT false,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeritOpen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ruleset" (
    "id" TEXT NOT NULL,
    "meritOpenId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "configJson" TEXT NOT NULL,
    "officialRulesText" TEXT NOT NULL,
    "termsVersion" TEXT NOT NULL,
    "hash" TEXT,
    "lockedAt" TIMESTAMP(3),
    "supersededById" TEXT,
    "correctionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ruleset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reservation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "meritOpenId" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Registration" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "meritOpenId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "confirmedAt" TIMESTAMP(3),
    "eligibilitySnapshotJson" TEXT NOT NULL DEFAULT '{}',
    "acceptedRulesHash" TEXT,
    "acceptedTermsVersion" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "proctoringConsentAt" TIMESTAMP(3),
    "disqualifiedReason" TEXT,
    "affidavitSignedAt" TIMESTAMP(3),
    "reVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Registration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "processorRef" TEXT,
    "amountCents" INTEGER NOT NULL,
    "feeCents" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "status" TEXT NOT NULL DEFAULT 'authorized',
    "custodianSettlementRef" TEXT,
    "settledAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Refund" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "reason" TEXT NOT NULL,
    "processorRef" TEXT,
    "attemptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Round" (
    "id" TEXT NOT NULL,
    "meritOpenId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3),
    "windowEnd" TIMESTAMP(3),
    "scheduledAt" TIMESTAMP(3),
    "durationSeconds" INTEGER NOT NULL,
    "latencyGraceSeconds" INTEGER NOT NULL DEFAULT 3,
    "integrityTier" INTEGER NOT NULL DEFAULT 1,
    "capacity" INTEGER,
    "formId" TEXT,
    "reserveFormId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "unsealedAt" TIMESTAMP(3),
    "unsealedById" TEXT,
    "scoresPostedAt" TIMESTAMP(3),
    "disputeDeadlineAt" TIMESTAMP(3),
    "rescheduleReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Round_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Form" (
    "id" TEXT NOT NULL,
    "meritOpenId" TEXT NOT NULL,
    "roundNumber" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "packageHash" TEXT,
    "hashPublishedAt" TIMESTAMP(3),
    "sealedPackage" TEXT,
    "releasedPackage" TEXT,
    "packageReleasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Form_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "prompt" TEXT NOT NULL,
    "inputType" TEXT NOT NULL,
    "scoringSpecJson" TEXT,
    "validationRulesJson" TEXT,
    "fieldsJson" TEXT,
    "inputHint" TEXT,
    "maxPoints" DOUBLE PRECISION NOT NULL,
    "tieOrderFlag" BOOLEAN NOT NULL DEFAULT false,
    "calculatorPermitted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attempt" (
    "id" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "sessionToken" TEXT NOT NULL,
    "deviceFingerprint" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "focusLossEventsJson" TEXT NOT NULL DEFAULT '[]',
    "proctoringSessionRef" TEXT,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "voidReason" TEXT,

    CONSTRAINT "Attempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Response" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "rawAnswer" TEXT NOT NULL,
    "renderedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "score" DOUBLE PRECISION,
    "valid" BOOLEAN,
    "canonical" TEXT,

    CONSTRAINT "Response_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Score" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "totalPoints" DOUBLE PRECISION NOT NULL,
    "tieOrderPoints" DOUBLE PRECISION NOT NULL,
    "elapsedSeconds" INTEGER NOT NULL,
    "r1Pass" BOOLEAN,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "keyPackageHashUsed" TEXT NOT NULL,

    CONSTRAINT "Score_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Advancement" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "rank" INTEGER,
    "advanced" BOOLEAN NOT NULL,
    "reason" TEXT NOT NULL,
    "certificationId" TEXT,
    "certifiedAt" TIMESTAMP(3),

    CONSTRAINT "Advancement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrityFlag" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "evidenceJson" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "decisionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntegrityFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dispute" (
    "id" TEXT NOT NULL,
    "registrationId" TEXT,
    "reporterUserId" TEXT,
    "roundId" TEXT,
    "itemId" TEXT,
    "type" TEXT NOT NULL,
    "filedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deadlineAt" TIMESTAMP(3),
    "statement" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "decision" TEXT,
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certification" (
    "id" TEXT NOT NULL,
    "meritOpenId" TEXT NOT NULL,
    "roundId" TEXT,
    "type" TEXT NOT NULL,
    "documentJson" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "signedById" TEXT NOT NULL,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Certification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Accommodation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "meritOpenId" TEXT NOT NULL,
    "request" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'requested',
    "decision" TEXT,
    "extraTimeSeconds" INTEGER NOT NULL DEFAULT 0,
    "assistiveFlagsJson" TEXT NOT NULL DEFAULT '[]',
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Accommodation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "seq" SERIAL NOT NULL,
    "actorId" TEXT,
    "actorRole" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "objectType" TEXT NOT NULL,
    "objectId" TEXT NOT NULL,
    "beforeHash" TEXT,
    "afterHash" TEXT,
    "detailJson" TEXT,
    "prevHash" TEXT,
    "entryHash" TEXT NOT NULL,
    "ip" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("seq")
);

-- CreateTable
CREATE TABLE "StateRule" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "eligible" BOOLEAN NOT NULL DEFAULT false,
    "disclosureTemplate" TEXT,
    "counselStatus" TEXT NOT NULL DEFAULT 'not_reviewed',
    "notes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StateRule_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "ExclusionEntry" (
    "id" TEXT NOT NULL,
    "matchType" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "party" TEXT NOT NULL,
    "addedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExclusionEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "configJson" TEXT NOT NULL DEFAULT '{}',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "publicSummaryUrl" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "meritOpenId" TEXT,
    "kind" TEXT NOT NULL,
    "mandatory" BOOLEAN NOT NULL DEFAULT false,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteSetting" (
    "key" TEXT NOT NULL,
    "valueJson" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Property_slug_key" ON "Property"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "MeritOpen_slug_key" ON "MeritOpen"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "MeritOpen_listingNo_key" ON "MeritOpen"("listingNo");

-- CreateIndex
CREATE UNIQUE INDEX "Ruleset_meritOpenId_version_key" ON "Ruleset"("meritOpenId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_userId_meritOpenId_key" ON "Reservation"("userId", "meritOpenId");

-- CreateIndex
CREATE UNIQUE INDEX "Registration_userId_meritOpenId_key" ON "Registration"("userId", "meritOpenId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_registrationId_key" ON "Payment"("registrationId");

-- CreateIndex
CREATE UNIQUE INDEX "Round_formId_key" ON "Round"("formId");

-- CreateIndex
CREATE UNIQUE INDEX "Round_reserveFormId_key" ON "Round"("reserveFormId");

-- CreateIndex
CREATE UNIQUE INDEX "Round_meritOpenId_number_key" ON "Round"("meritOpenId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "Item_formId_position_key" ON "Item"("formId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "Attempt_sessionToken_key" ON "Attempt"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "Attempt_registrationId_roundId_key" ON "Attempt"("registrationId", "roundId");

-- CreateIndex
CREATE UNIQUE INDEX "Response_attemptId_itemId_key" ON "Response"("attemptId", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "Score_attemptId_key" ON "Score"("attemptId");

-- CreateIndex
CREATE UNIQUE INDEX "Advancement_roundId_registrationId_key" ON "Advancement"("roundId", "registrationId");

-- CreateIndex
CREATE UNIQUE INDEX "Accommodation_userId_meritOpenId_key" ON "Accommodation"("userId", "meritOpenId");

-- AddForeignKey
ALTER TABLE "MeritOpen" ADD CONSTRAINT "MeritOpen_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ruleset" ADD CONSTRAINT "Ruleset_meritOpenId_fkey" FOREIGN KEY ("meritOpenId") REFERENCES "MeritOpen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_meritOpenId_fkey" FOREIGN KEY ("meritOpenId") REFERENCES "MeritOpen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_meritOpenId_fkey" FOREIGN KEY ("meritOpenId") REFERENCES "MeritOpen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Round" ADD CONSTRAINT "Round_meritOpenId_fkey" FOREIGN KEY ("meritOpenId") REFERENCES "MeritOpen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Round" ADD CONSTRAINT "Round_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Round" ADD CONSTRAINT "Round_reserveFormId_fkey" FOREIGN KEY ("reserveFormId") REFERENCES "Form"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Form" ADD CONSTRAINT "Form_meritOpenId_fkey" FOREIGN KEY ("meritOpenId") REFERENCES "MeritOpen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Response" ADD CONSTRAINT "Response_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "Attempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Response" ADD CONSTRAINT "Response_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Score" ADD CONSTRAINT "Score_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "Attempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Advancement" ADD CONSTRAINT "Advancement_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Advancement" ADD CONSTRAINT "Advancement_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrityFlag" ADD CONSTRAINT "IntegrityFlag_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "Attempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certification" ADD CONSTRAINT "Certification_meritOpenId_fkey" FOREIGN KEY ("meritOpenId") REFERENCES "MeritOpen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Accommodation" ADD CONSTRAINT "Accommodation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Accommodation" ADD CONSTRAINT "Accommodation_meritOpenId_fkey" FOREIGN KEY ("meritOpenId") REFERENCES "MeritOpen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_meritOpenId_fkey" FOREIGN KEY ("meritOpenId") REFERENCES "MeritOpen"("id") ON DELETE SET NULL ON UPDATE CASCADE;

