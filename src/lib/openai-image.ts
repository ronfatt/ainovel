import { toFile } from "openai";
import {
  getOpenAIClient,
  getOpenAIImageModel,
} from "@/lib/openai";

type GenerateImageInput = {
  prompt: string;
  referenceImageData?: string | null;
  size?: "1024x1024" | "1024x1536" | "1536x1024" | "auto";
  quality?: "low" | "medium" | "high" | "auto";
};

type GeneratedImage = {
  imageData: string;
  mimeType: string;
  model: string;
};

function parseDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:(.+?);base64,(.+)$/);

  if (!match) {
    throw new Error("Reference image is not a valid data URL.");
  }

  return {
    mimeType: match[1] || "image/png",
    buffer: Buffer.from(match[2], "base64"),
  };
}

export async function generateImage({
  prompt,
  referenceImageData,
  size = "1024x1536",
  quality = "high",
}: GenerateImageInput): Promise<GeneratedImage> {
  const client = getOpenAIClient();
  const model = getOpenAIImageModel();

  const response = referenceImageData
    ? await (async () => {
        const { buffer, mimeType } = parseDataUrl(referenceImageData);
        const extension = mimeType.split("/")[1] || "png";
        const file = await toFile(buffer, `reference.${extension}`, {
          type: mimeType,
        });

        return client.images.edit({
          model,
          image: file,
          prompt,
          size,
          quality,
          output_format: "png",
          input_fidelity: "high",
        });
      })()
    : await client.images.generate({
        model,
        prompt,
        size,
        quality,
        output_format: "png",
      });

  const imageBase64 = response.data?.[0]?.b64_json;

  if (!imageBase64) {
    throw new Error("Image generation returned no image data.");
  }

  return {
    imageData: `data:image/png;base64,${imageBase64}`,
    mimeType: "image/png",
    model,
  };
}
