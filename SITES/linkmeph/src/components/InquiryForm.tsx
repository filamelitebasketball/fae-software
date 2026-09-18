"use client";

import * as React from "react";
import { Check, Loader2, Send } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export interface InquiryFormData {
  name: string;
  organization: string;
  service: string;
  contactNumber: string;
  eventDate: string;
}

export interface InquiryFormProps {
  onSubmit?: (data: InquiryFormData) => void | Promise<void>;
  className?: string;
}

const SERVICE_OPTIONS = [
  { value: "live-streaming", label: "Live Streaming" },
  { value: "digital-cards", label: "Digital Business Cards" },
  { value: "social-media", label: "Social Media Content & Posting" },
  { value: "web-software", label: "Web & Business Flow Software" },
];

const REQUIRED_FIELDS: (keyof InquiryFormData)[] = [
  "name",
  "organization",
  "service",
  "contactNumber",
  "eventDate",
];

function isValidService(value: string): value is InquiryFormData["service"] {
  return SERVICE_OPTIONS.some((opt) => opt.value === value);
}

function validate(data: InquiryFormData): Partial<Record<keyof InquiryFormData, string>> {
  const next: Partial<Record<keyof InquiryFormData, string>> = {};

  if (!data.name.trim()) {
    next.name = "Please enter your name.";
  } else if (data.name.trim().length > 100) {
    next.name = "Name must be under 100 characters.";
  }

  if (!data.organization.trim()) {
    next.organization = "Please enter an organization or league name.";
  } else if (data.organization.trim().length > 100) {
    next.organization = "Organization name must be under 100 characters.";
  }

  if (!data.service) {
    next.service = "Please select a service.";
  } else if (!isValidService(data.service)) {
    next.service = "Please select a valid service.";
  }

  if (!data.contactNumber.trim()) {
    next.contactNumber = "Please enter a contact number.";
  } else if (!/^[+\d\s\-()]{7,20}$/.test(data.contactNumber.trim())) {
    next.contactNumber = "Please enter a valid phone number.";
  }

  if (!data.eventDate) {
    next.eventDate = "Please select an event date.";
  } else if (Number.isNaN(Date.parse(data.eventDate))) {
    next.eventDate = "Please select a valid date.";
  }

  return next;
}

export function InquiryForm({ onSubmit, className }: InquiryFormProps) {
  const [values, setValues] = React.useState<InquiryFormData>({
    name: "",
    organization: "",
    service: "",
    contactNumber: "",
    eventDate: "",
  });
  const [errors, setErrors] = React.useState<Partial<Record<keyof InquiryFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSubmitted, setIsSubmitted] = React.useState(false);

  function updateField<K extends keyof InquiryFormData>(field: K, value: InquiryFormData[K]) {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validate(values);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      toast.error("Please fix the form errors before submitting.");
      return;
    }

    setIsSubmitting(true);

    try {
      if (onSubmit) {
        await Promise.resolve(onSubmit(values));
      }
      setIsSubmitted(true);
      toast.success("Inquiry submitted! Our team will reach out soon.");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleReset() {
    setValues({
      name: "",
      organization: "",
      service: "",
      contactNumber: "",
      eventDate: "",
    });
    setErrors({});
    setIsSubmitted(false);
  }

  const selectedServiceLabel = SERVICE_OPTIONS.find((opt) => opt.value === values.service)?.label;

  if (isSubmitted) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Check className="h-5 w-5" />
          </div>
          <CardTitle className="text-xl">Inquiry Received</CardTitle>
          <CardDescription>
            Thanks{values.name ? `, ${values.name.trim()}` : ""}! We&apos;ll contact you about{" "}
            {selectedServiceLabel ? selectedServiceLabel.toLowerCase() : "your request"} soon.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Organization</dt>
              <dd className="font-medium">{values.organization.trim()}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Contact</dt>
              <dd className="font-medium">{values.contactNumber.trim()}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Event Date</dt>
              <dd className="font-medium">
                {new Date(values.eventDate).toLocaleDateString("en-PH", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </dd>
            </div>
          </dl>
          <Button onClick={handleReset} variant="outline" className="mt-6 w-full">
            Submit Another Inquiry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="text-xl">Request a Service</CardTitle>
        <CardDescription>
          Tell us about your league or business and the service you need.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="inquiry-name">Name</Label>
            <Input
              id="inquiry-name"
              value={values.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="Juan dela Cruz"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "inquiry-name-error" : undefined}
            />
            {errors.name && (
              <p id="inquiry-name-error" className="text-sm text-destructive">
                {errors.name}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="inquiry-organization">Organization / League Name</Label>
            <Input
              id="inquiry-organization"
              value={values.organization}
              onChange={(e) => updateField("organization", e.target.value)}
              placeholder="e.g. Filamelite Basketball, ABC Company"
              aria-invalid={!!errors.organization}
              aria-describedby={errors.organization ? "inquiry-organization-error" : undefined}
            />
            {errors.organization && (
              <p id="inquiry-organization-error" className="text-sm text-destructive">
                {errors.organization}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="inquiry-service">Service Needed</Label>
            <Select
              value={values.service}
              onValueChange={(value) => updateField("service", value)}
            >
              <SelectTrigger
                id="inquiry-service"
                aria-invalid={!!errors.service}
                aria-describedby={errors.service ? "inquiry-service-error" : undefined}
              >
                <SelectValue placeholder="Select a service" />
              </SelectTrigger>
              <SelectContent>
                {SERVICE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.service && (
              <p id="inquiry-service-error" className="text-sm text-destructive">
                {errors.service}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="inquiry-contact">Contact Number</Label>
            <Input
              id="inquiry-contact"
              type="tel"
              value={values.contactNumber}
              onChange={(e) => updateField("contactNumber", e.target.value)}
              placeholder="+63 912 345 6789"
              aria-invalid={!!errors.contactNumber}
              aria-describedby={errors.contactNumber ? "inquiry-contact-error" : undefined}
            />
            {errors.contactNumber && (
              <p id="inquiry-contact-error" className="text-sm text-destructive">
                {errors.contactNumber}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="inquiry-date">Event Date</Label>
            <Input
              id="inquiry-date"
              type="date"
              value={values.eventDate}
              onChange={(e) => updateField("eventDate", e.target.value)}
              aria-invalid={!!errors.eventDate}
              aria-describedby={errors.eventDate ? "inquiry-date-error" : undefined}
            />
            {errors.eventDate && (
              <p id="inquiry-date-error" className="text-sm text-destructive">
                {errors.eventDate}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Submit Inquiry
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
