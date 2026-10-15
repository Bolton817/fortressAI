import { RawBriefInput } from "@/core/schema/business-brief";

/**
 * Fortress AI — Intake Follow-up Engine (TDD §11.1 Stage A, FR-016)
 * Detects missing high-impact facts and generates targeted questions.
 * Invariant: Low-impact fields fall back to safe defaults; never trap user in an infinite intake loop.
 */

export interface FollowUpQuestion {
  id: string;
  fieldKey: string;
  question: string;
  type: "text" | "choice" | "multi_choice";
  options?: string[];
  isOptional: boolean;
  defaultAnswer?: string;
  explanation: string;
}

export function evaluateBriefCompleteness(raw: Partial<RawBriefInput>): {
  isComplete: boolean;
  canProceedWithDefaults: boolean;
  questions: FollowUpQuestion[];
} {
  const questions: FollowUpQuestion[] = [];

  // Check 1: Business Name (Critical Essential)
  if (!raw.businessName || raw.businessName.trim().length === 0) {
    questions.push({
      id: "q_business_name",
      fieldKey: "businessName",
      question: "What is your official business or brand name?",
      type: "text",
      isOptional: false,
      explanation: "Required for brand identity and navigation titles.",
    });
  }

  // Check 2: Core Offerings (High Impact)
  const serviceCount = Array.isArray(raw.services) ? raw.services.length : 0;
  if (serviceCount === 0) {
    questions.push({
      id: "q_offerings",
      fieldKey: "services",
      question: "What are 2 or 3 of the main services or products you offer?",
      type: "text",
      isOptional: false,
      explanation: "Needed to populate your services section and describe your value proposition.",
    });
  }

  // Check 3: Primary Contact Method (High Impact for Conversion)
  const hasContact = Boolean(raw.email?.trim() || raw.phone?.trim() || raw.whatsapp?.trim());
  if (!hasContact) {
    questions.push({
      id: "q_contact_method",
      fieldKey: "contactMethod",
      question: "How do you prefer prospective clients to reach you?",
      type: "choice",
      options: ["Email inquiry", "WhatsApp chat", "Phone call", "Physical office visit"],
      isOptional: true,
      defaultAnswer: "Email inquiry",
      explanation: "Configures your primary calls-to-action and contact forms.",
    });
  }

  // Check 4: Location / Service Area (High impact for regional local businesses)
  if (!raw.city?.trim() && !raw.country?.trim()) {
    questions.push({
      id: "q_location",
      fieldKey: "city",
      question: "Where is your business based, or what region do you primarily serve?",
      type: "text",
      isOptional: true,
      defaultAnswer: "Nairobi, Kenya",
      explanation: "Ensures accurate geographic and regional context in your footer and contact details.",
    });
  }

  // Check 5: Conversion Goal (Can default safely)
  if (!raw.conversionGoal) {
    questions.push({
      id: "q_goal",
      fieldKey: "conversionGoal",
      question: "What is the primary action you want website visitors to take?",
      type: "choice",
      options: [
        "Request a quote or proposal",
        "Send an enquiry message",
        "Book a consultation or appointment",
        "Call directly or WhatsApp us",
        "Browse portfolio and case studies",
      ],
      isOptional: true,
      defaultAnswer: "Send an enquiry message",
      explanation: "Shapes the hero CTA button and header action.",
    });
  }

  // Decision logic:
  // A brief CAN proceed with defaults if we have a business name and either services or a business summary.
  const hasIdentity = Boolean(raw.businessName?.trim());
  const hasValueProp = serviceCount > 0 || Boolean(raw.summary?.trim()) || Boolean(raw.description?.trim());
  const canProceedWithDefaults = hasIdentity && hasValueProp;
  const isComplete = questions.length === 0;

  return {
    isComplete,
    canProceedWithDefaults,
    questions,
  };
}

export function applyFollowUpAnswers(
  raw: Partial<RawBriefInput>,
  answers: Record<string, any>
): RawBriefInput {
  const merged: any = { ...raw };

  if (answers.businessName) merged.businessName = String(answers.businessName).trim();
  if (answers.city) merged.city = String(answers.city).trim();
  if (answers.country) merged.country = String(answers.country).trim();

  if (answers.services) {
    if (typeof answers.services === "string") {
      const items = answers.services
        .split(/[,\n;]+/)
        .map((s: string) => s.trim())
        .filter(Boolean);
      merged.services = items;
    } else if (Array.isArray(answers.services)) {
      merged.services = answers.services;
    }
  }

  if (answers.conversionGoal) {
    const goalStr = String(answers.conversionGoal).toLowerCase();
    if (goalStr.includes("quote")) merged.conversionGoal = "quote";
    else if (goalStr.includes("call") || goalStr.includes("whatsapp")) merged.conversionGoal = "call";
    else if (goalStr.includes("book")) merged.conversionGoal = "booking";
    else if (goalStr.includes("portfolio")) merged.conversionGoal = "portfolio";
    else merged.conversionGoal = "enquiry";
  }

  return merged as RawBriefInput;
}
