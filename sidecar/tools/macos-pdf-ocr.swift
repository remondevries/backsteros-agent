#!/usr/bin/env swift
import AppKit
import Foundation
import PDFKit
import Vision

enum OcrError: Error {
  case missingPath
  case unreadableFile
  case noText
}

func usage() -> Never {
  fputs("Usage: macos-pdf-ocr <path-to-pdf-or-image>\n", stderr)
  exit(1)
}

func recognizeText(in cgImage: CGImage) throws -> String {
  let request = VNRecognizeTextRequest()
  request.recognitionLevel = .accurate
  request.usesLanguageCorrection = true

  let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
  try handler.perform([request])

  guard let observations = request.results else {
    return ""
  }

  return observations
    .compactMap { $0.topCandidates(1).first?.string }
    .joined(separator: "\n")
}

func renderPdfPage(_ page: PDFPage, scale: CGFloat = 2.0) -> CGImage? {
  let bounds = page.bounds(for: .mediaBox)
  let thumbnailSize = NSSize(
    width: max(bounds.width * scale, 1),
    height: max(bounds.height * scale, 1)
  )
  let thumbnail = page.thumbnail(of: thumbnailSize, for: .mediaBox)
  var rect = NSRect(origin: .zero, size: thumbnail.size)
  return thumbnail.cgImage(forProposedRect: &rect, context: nil, hints: nil)
}

func extractPdfText(at url: URL) throws -> String {
  guard let document = PDFDocument(url: url) else {
    throw OcrError.unreadableFile
  }

  var pages: [String] = []
  for index in 0 ..< document.pageCount {
    guard let page = document.page(at: index) else {
      continue
    }
    guard let image = renderPdfPage(page) else {
      continue
    }
    let pageText = try recognizeText(in: image).trimmingCharacters(in: .whitespacesAndNewlines)
    if !pageText.isEmpty {
      pages.append(pageText)
    }
  }

  let text = pages.joined(separator: "\n\n").trimmingCharacters(in: .whitespacesAndNewlines)
  if text.isEmpty {
    throw OcrError.noText
  }
  return text
}

func extractImageText(at url: URL) throws -> String {
  guard let source = CGImageSourceCreateWithURL(url as CFURL, nil),
        let cgImage = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
    throw OcrError.unreadableFile
  }

  let text = try recognizeText(in: cgImage).trimmingCharacters(in: .whitespacesAndNewlines)
  if text.isEmpty {
    throw OcrError.noText
  }
  return text
}

func extractText(at path: String) throws -> String {
  let url = URL(fileURLWithPath: path)
  let ext = url.pathExtension.lowercased()

  if ext == "pdf" {
    return try extractPdfText(at: url)
  }

  return try extractImageText(at: url)
}

guard CommandLine.arguments.count >= 2 else {
  usage()
}

let path = CommandLine.arguments[1]

do {
  let text = try extractText(at: path)
  print(text)
} catch {
  fputs("macos-pdf-ocr failed: \(error)\n", stderr)
  exit(1)
}
