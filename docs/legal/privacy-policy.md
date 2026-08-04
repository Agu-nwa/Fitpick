# MyFitPick Privacy Policy

**Draft for Canadian legal review — not yet approved for publication**  
**Last updated:** August 4, 2026

## 1. Scope

This policy describes how MyFitPick collects, uses, discloses, stores and otherwise processes personal information through the MyFitPick website, progressive web application and iOS application (the “Service”). MyFitPick is an artificial-intelligence fashion technology platform operated from Canada.

[MYFITPICK INPUT REQUIRED: Provide the legal entity name, registered address and principal business location so users know which organization is accountable.]

## 2. Information We Collect

### Account and authentication information

We collect a name, email address, account identifiers, sign-in and OTP verification records, session information, login timestamps, IP address and user-agent information. A password hash may be stored where password authentication is used; email OTP authentication is implemented.

### Wardrobe and fashion information

We collect photographs and details users provide about wardrobe items, including front, back, label and fabric images; category, subtype, colour, size, fit, brand, materials, care information, occasions and weather suitability. We also create inferred metadata, confidence indicators, taxonomy review status and compatibility information.

### Studio Model and Virtual Try-On information

Users may choose model configuration information such as gender presentation, body type, skin tone, hair characteristics, height band and fit preferences. Optional fields support body measurements, shoe size and model images. These attributes can be sensitive in context. MyFitPick uses them to configure a fashion model and preview; the repository does not establish that MyFitPick performs identity verification or biometric identification.

[CANADIAN LEGAL REVIEW REQUIRED: Confirm whether any Studio Model or uploaded model-image processing constitutes biometric information under applicable provincial law and determine the required consent.]

### Inspiration, generated and recommendation information

We collect inspiration images, related descriptions and analysis; stylist prompts and responses; outfit recommendations; item identifiers; occasion and weather context; confidence and completeness information; saved, worn and feedback activity; and generated preview images and provider-fidelity metadata.

### Location and weather information

If a user saves a dressing location, we may collect a city, country, latitude, longitude, timezone and update timestamp. This is used for weather-aware styling. The implementation is based on a selected location, not continuous background location tracking.

### Payments and Credits

We store Credit balances and transaction history, pack and purchase details, payment-provider references, payment status, amount and currency, refund and dispute status. Payment providers process payment credentials; the repository does not show MyFitPick storing full card numbers.

### Support, notifications and feedback

We collect support messages, attachments, conversation status and read state; notification preferences; and feedback about recommendations and previews.

### Technical information

We process session cookies, IP address, user agent, request and audit metadata, application errors, provider status, rate-limit information and security events. Local browser storage may temporarily retain wardrobe-upload draft state. Session storage may retain a short-lived client recovery flag.

## 3. Sources

Information comes directly from users, their devices, automated inferences made by MyFitPick, generated outputs, payment and app-store providers, email delivery providers, weather services, support interactions and technical service providers.

## 4. Why We Use Information

We use information to authenticate users; provide and secure accounts; store and organize wardrobes; analyze fashion images; generate recommendations and previews; personalize style results; provide weather-aware suggestions; process purchases and Credits; prevent duplicate charges and abuse; provide support; send transactional notifications; troubleshoot errors; meet legal obligations; and improve reliability and safety.

## 5. Consent and Other Legal Authority

MyFitPick relies on meaningful consent where required and may process information when necessary to provide requested services, comply with law or protect the Service. Optional personalization, history, marketing and photo-storage preferences exist in the data model, but the repository does not establish a complete consent-version and withdrawal workflow.

[CANADIAN LEGAL REVIEW REQUIRED: Confirm the lawful basis and form of consent for each sensitive image, Studio Model and cross-border AI-processing workflow, including Quebec requirements.]

## 6. AI, Profiling and Image Processing

AI may analyze wardrobe and inspiration images, extract label text, generate metadata and explanations, answer stylist requests, generate model or outfit imagery and create Virtual Try-On previews. Recommendation logic also uses saved wardrobe, preferences, history, occasion and weather context. AI results can be incomplete or wrong and users can review or edit many saved fields.

Current code supports OpenAI for text, vision and image workflows and FASHN as a configurable Virtual Try-On provider. Inputs sent depend on the feature. Provider capability metadata recognizes that previews may omit footwear, bags, watches, jewellery, eyewear or hair details.

[CANADIAN LEGAL REVIEW REQUIRED: Confirm provider data-retention and model-training settings.]

## 7. Disclosures and Service Providers

We disclose only the information needed for a service provider’s function. Repository evidence supports the use or integration of Amazon Web Services for object storage and delivery, MongoDB for databases, OpenAI for AI processing, FASHN for configured Virtual Try-On, Stripe for web payments, RevenueCat and Apple for iOS purchases, Resend for email and Sentry for error monitoring. CoinPayments is implemented behind a configuration flag. Vendor activation and regions must be verified before publication.

We do not state that we sell personal information. [MYFITPICK INPUT REQUIRED: Confirm that MyFitPick does not sell or disclose personal information for cross-context behavioural advertising and identify any advertising or analytics SDKs used outside this repository.]

## 8. Cross-Border Processing

Service providers may process information outside Canada, including in jurisdictions where privacy and lawful-access rules differ. Foreign courts, governments or law-enforcement authorities may lawfully access information in those jurisdictions. MyFitPick remains accountable as required by applicable Canadian privacy law and should use contractual, access-control and security safeguards appropriate to the information.

## 9. Cookies and Device Storage

MyFitPick sets a first-party, HTTP-only session cookie. It is configured with `SameSite=Lax`, a 30-day maximum age and secure transport when HTTPS or production configuration requires it. Essential cookies support sign-in and security. Local storage may hold a draft wardrobe upload; session storage may support client recovery. No repository evidence confirms advertising cookies.

[ENGINEERING VERIFICATION REQUIRED: Inventory all production analytics, tag-manager, CDN and embedded-support cookies before publication and determine whether a consent banner is required.]

## 10. Retention

The repository confirms a 30-day session-cookie maximum and an OTP TTL index that removes expired OTP records after an additional database expiry interval. Reference-fashion items contain expiry and cleanup fields. Most account, wardrobe, recommendation, image, support, payment, audit and generated-output records do not have confirmed business retention periods in code.

We retain records only for purposes that MyFitPick must define and document, including providing the Service, security, accounting, disputes and legal obligations.

[MYFITPICK INPUT REQUIRED: Approve a record-by-record retention schedule, backup retention and provider deletion schedule before publication.]

## 11. Deletion and User Choices

Users can edit profile and wardrobe information, archive wardrobe items and request a hard deletion of a wardrobe database record. Users can submit an account-deletion request in the Service. Currently, that request records a timestamp and returns that the backend deletion workflow is pending; it does not prove that user records, object-storage images, caches, logs, backups or provider copies are deleted.

Users may contact `support@myfitpick.com` for privacy support. Data export, consent withdrawal execution, support-message deletion, complete generated-image deletion and account recovery after deletion are not confirmed.

## 12. Security

Implemented controls include authenticated ownership checks, HTTP-only session cookies, request validation, rate limiting, hashed OTP codes, provider webhook verification, audit records, safe logging and restricted storage-key patterns. MyFitPick cannot guarantee absolute security.

[ENGINEERING VERIFICATION REQUIRED: Confirm encryption-at-rest settings, backup controls, production access review, incident response, vulnerability management and vendor security agreements.]

## 13. Children

[MYFITPICK INPUT REQUIRED: Set and enforce a minimum age and determine whether parental consent is required. No age gate is confirmed in the repository.]

## 14. Canadian Privacy Rights

Subject to applicable law, users may request access to and correction of personal information, withdraw consent where permitted, ask questions about processing outside Canada and complain about MyFitPick’s practices. Rights and exceptions differ under PIPEDA, Alberta PIPA, British Columbia PIPA and Quebec’s private-sector privacy law.

[MYFITPICK INPUT REQUIRED: Name the Privacy Officer and establish verified access, correction, withdrawal and complaint procedures and response timelines.]

## 15. Quebec Considerations

Before offering the Service to Quebec residents, MyFitPick should complete privacy impact assessments for systems involving personal information outside Quebec and for material AI/image workflows, establish privacy governance policies, identify a privacy officer, document confidentiality-incident handling and assess automated-decision notice requirements.

## 16. Updates and Contact

Material changes should be communicated and, where required, renewed consent obtained. Contact: `support@myfitpick.com`.

## Assumptions Made

The repository represents the current product; configured providers may differ by environment.

## Missing Information Required from MyFitPick

Legal entity, address, Privacy Officer, age, vendor regions/contracts, retention schedule, training settings, incident process and complete production cookie inventory.

## Legal Review Notes

Canadian counsel must review consent, Quebec Law 25, children, biometric characterization, consumer terms and international processing.

## Recommended Updates Before Production Use

Implement deletion orchestration, consent/version records, rights workflows, retention controls and verified vendor notices.

## Codebase Evidence Reviewed

`models/User.ts`, `models/PrivacyPreference.ts`, `models/AvatarProfile.ts`, wardrobe/reference/outfit/support/payment models, `lib/auth.ts`, `lib/cookies.ts`, storage and AI adapters, and deletion/payment/support routes.

## Document Status

Draft for review by a licensed Canadian technology and privacy lawyer; not legal advice or approved production copy.
