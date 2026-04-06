"use client";

import { httpsCallable } from "firebase/functions";
import { ref, uploadBytes } from "firebase/storage";
import { getFirebaseClientFunctions, getFirebaseClientStorage } from "@/lib/firebase/client";
import type { UploadReferenceInput } from "@/shared/catalog";

type CreateUploadReservationRequest = {
  originalFilename: string;
  mimeType: string;
  fileSize: number;
};

type CreateUploadReservationResponse = {
  uploadId: string;
  storagePath: string;
  expiresAt: string;
};

export async function uploadCustomerFile(file: File): Promise<UploadReferenceInput> {
  const callable = httpsCallable<CreateUploadReservationRequest, CreateUploadReservationResponse>(
    getFirebaseClientFunctions(),
    "createUploadReservation"
  );
  const reservation = await callable({
    originalFilename: file.name,
    mimeType: file.type,
    fileSize: file.size
  });

  const { uploadId, storagePath } = reservation.data;
  const storageRef = ref(getFirebaseClientStorage(), storagePath);
  await uploadBytes(storageRef, file, {
    contentType: file.type
  });

  return {
    uploadId,
    originalFilename: file.name
  };
}
