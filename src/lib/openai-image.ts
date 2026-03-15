import {
  getOpenAIClient,
  getOpenAIImageModel,
} from "@/lib/openai";
import type { ResponseInputMessageContentList } from "openai/resources/responses/responses";

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

export async function generateImage({
  prompt,
  referenceImageData,
  size = "1024x1536",
  quality = "high",
}: GenerateImageInput): Promise<GeneratedImage> {
  const client = getOpenAIClient();
  const model = getOpenAIImageModel();

  const content: ResponseInputMessageContentList = [{ type: "input_text", text: prompt }];

  if (referenceImageData) {
    content.push({
      type: "input_image",
      image_url: referenceImageData,
      detail: "high",
    });
  }

  const response = await client.responses.create({
    model: "gpt-4.1",
    input: [
      {
        type: "message",
        role: "user",
        content,
      },
    ],
    tools: [
      {
        type: "image_generation",
        model,
        size,
        quality,
        output_format: "png",
        input_fidelity: referenceImageData ? "high" : "low",
      },
    ],
    tool_choice: {
      type: "image_generation",
    },
  });

  const imageCall = response.output.find((item) => {
    if (item.type !== "image_generation_call") {
      return false;
    }

    return item.status === "completed" && Boolean(item.result);
  }) as { result: string | null } | undefined;

  if (!imageCall?.result) {
    throw new Error("Image generation returned no image data.");
  }

  return {
    imageData: `data:image/png;base64,${imageCall.result}`,
    mimeType: "image/png",
    model,
  };
}
