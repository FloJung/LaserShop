import type { CartConfigurationInput, CartConfigurationInputValue, ProductOptionType, UploadReferenceInput } from "./models";

export type StorefrontOptionValue = {
  id: string;
  label: string;
  value: string;
  sortOrder: number;
  priceModifierCents: number;
};

export type StorefrontOption = {
  id: string;
  name: string;
  code: string;
  type: ProductOptionType;
  isRequired: boolean;
  helpText?: string;
  placeholder?: string;
  maxLength?: number;
  priceModifierCents: number;
  pricingMode: "none" | "fixed" | "per_character";
  sortOrder: number;
  acceptedMimeTypes?: string[];
  values: StorefrontOptionValue[];
};

export type PersonalizationValueMap = Record<string, CartConfigurationInputValue | undefined>;

export type CartItemPersonalization = CartConfigurationInput & {
  optionCode: string;
  optionName: string;
  optionType: ProductOptionType;
  renderedValue: string;
  priceModifierCents: number;
};

function hasUploadReference(value: CartConfigurationInputValue | undefined): value is UploadReferenceInput {
  return Boolean(value && typeof value === "object" && !Array.isArray(value) && "uploadId" in value);
}

export function getProductPersonalizationOptions(options: StorefrontOption[]) {
  return [...options].sort((left, right) => left.sortOrder - right.sortOrder);
}

export function validatePersonalizationInputs(options: StorefrontOption[], values: PersonalizationValueMap) {
  const errors: Record<string, string> = {};

  for (const option of options) {
    const value = values[option.id];

    if (option.type === "checkbox") {
      if (option.isRequired && value !== true) {
        errors[option.id] = `${option.name} muss bestaetigt werden.`;
      }
      continue;
    }

    if (option.type === "file") {
      if (option.isRequired && !hasUploadReference(value)) {
        errors[option.id] = `${option.name} ist erforderlich.`;
      }
      continue;
    }

    if (option.type === "select") {
      if (option.isRequired && (typeof value !== "string" || !value.trim())) {
        errors[option.id] = `${option.name} ist erforderlich.`;
      }
      continue;
    }

    if (option.type === "text" || option.type === "textarea") {
      const stringValue = typeof value === "string" ? value.trim() : "";
      if (option.isRequired && !stringValue) {
        errors[option.id] = `${option.name} ist erforderlich.`;
        continue;
      }

      if (option.maxLength && stringValue.length > option.maxLength) {
        errors[option.id] = `${option.name} darf maximal ${option.maxLength} Zeichen haben.`;
      }
    }
  }

  return errors;
}

export function buildPersonalizationConfigurations(options: StorefrontOption[], values: PersonalizationValueMap) {
  return getProductPersonalizationOptions(options).reduce<CartItemPersonalization[]>((result, option) => {
    const value = values[option.id];

    if (option.type === "checkbox") {
      if (value !== true) {
        return result;
      }

      result.push({
          optionId: option.id,
          value: true,
          optionCode: option.code,
          optionName: option.name,
          optionType: option.type,
          renderedValue: "Ja",
          priceModifierCents: option.pricingMode === "fixed" ? option.priceModifierCents : 0
      });
      return result;
    }

    if (option.type === "file") {
      if (!hasUploadReference(value)) {
        return result;
      }

      result.push({
          optionId: option.id,
          value,
          optionCode: option.code,
          optionName: option.name,
          optionType: option.type,
          renderedValue: value.originalFilename ?? value.uploadId,
          priceModifierCents: option.pricingMode === "fixed" ? option.priceModifierCents : 0
      });
      return result;
    }

    if (option.type === "select") {
      if (typeof value !== "string" || !value.trim()) {
        return result;
      }

      const selectedValue = option.values.find((entry) => entry.value === value);
      if (!selectedValue) {
        return result;
      }

      result.push({
          optionId: option.id,
          value,
          optionCode: option.code,
          optionName: option.name,
          optionType: option.type,
          renderedValue: selectedValue.label,
          priceModifierCents:
            (option.pricingMode === "fixed" ? option.priceModifierCents : 0) + selectedValue.priceModifierCents
      });
      return result;
    }

    if (typeof value !== "string" || !value.trim()) {
      return result;
    }

    const trimmedValue = value.trim();
    result.push({
        optionId: option.id,
        value: trimmedValue,
        optionCode: option.code,
        optionName: option.name,
        optionType: option.type,
        renderedValue: trimmedValue,
        priceModifierCents:
          option.pricingMode === "per_character"
            ? option.priceModifierCents * trimmedValue.length
            : option.pricingMode === "fixed"
              ? option.priceModifierCents
              : 0
    });
    return result;
  }, []);
}
