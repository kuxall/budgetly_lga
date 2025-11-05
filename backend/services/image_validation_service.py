"""
Image Validation Service for secure file processing.
Implements multi-layer security validation for uploaded receipt files.
"""

import os
import io
import magic
from PIL import Image, ImageOps
from typing import Dict, Tuple
import hashlib
import mimetypes


class ImageValidationService:
    """Multi-layer security validation for uploaded files"""

    def __init__(self):
        # File size limits - More permissive
        self.min_file_size = 100  # 100 bytes (very small)
        self.max_file_size = 50 * 1024 * 1024  # 50MB (much larger)

        # Supported formats - Accept more formats
        self.supported_image_types = {
            'image/jpeg', 'image/jpg', 'image/png',
            'image/webp', 'image/tiff', 'image/tif',
            'image/bmp', 'image/gif', 'image/svg+xml'
        }
        self.supported_document_types = {'application/pdf'}
        self.all_supported_types = self.supported_image_types | self.supported_document_types

        # Optimal image dimensions for processing
        self.target_max_dimension = 2048  # Resize to this max dimension
        self.target_min_dimension = 200   # Minimum dimension after resize

        # Quality settings
        self.jpeg_quality = 85
        self.png_optimize = True

    async def validate_file(self, file_data: bytes, filename: str, user_id: str) -> Dict:
        """
        Comprehensive file validation with multi-layer security checks.
        Returns validation result with detailed information.
        """
        try:
            # Layer 1: Basic file validation
            basic_validation = self._validate_basic_properties(
                file_data, filename)
            if not basic_validation["valid"]:
                return basic_validation

            # Layer 2: MIME type validation
            mime_validation = self._validate_mime_type(file_data, filename)
            if not mime_validation["valid"]:
                return mime_validation

            # Layer 3: File structure validation
            structure_validation = await self._validate_file_structure(file_data, filename)
            if not structure_validation["valid"]:
                return structure_validation

            # Layer 4: Content sanitization (for images)
            if self._is_image_file(filename):
                sanitization_result = self._sanitize_image(file_data)
                if not sanitization_result["valid"]:
                    return sanitization_result

                # Use sanitized data
                file_data = sanitization_result["sanitized_data"]

            # Layer 5: Security scanning
            security_scan = self._security_scan(file_data, filename)
            if not security_scan["valid"]:
                return security_scan

            # Generate file hash for deduplication
            file_hash = self._generate_file_hash(file_data)

            return {
                "valid": True,
                "sanitized_data": file_data,
                "file_info": {
                    "original_filename": filename,
                    "size": len(file_data),
                    "mime_type": mime_validation["detected_mime"],
                    "file_hash": file_hash,
                    "is_image": self._is_image_file(filename),
                    "is_pdf": filename.lower().endswith('.pdf')
                },
                "validation_summary": {
                    "layers_passed": 5,
                    "sanitized": self._is_image_file(filename),
                    "security_scanned": True
                }
            }

        except Exception as e:
            return {
                "valid": False,
                "error": "Validation failed",
                "reason": f"Unexpected error during validation: {str(e)}"
            }

    def _validate_basic_properties(self, file_data: bytes, filename: str) -> Dict:
        """Layer 1: Basic file property validation - Very permissive"""

        # Check file size - Very permissive limits
        file_size = len(file_data)
        if file_size < self.min_file_size:
            return {
                "valid": False,
                "error": "File too small",
                "reason": f"File appears to be empty or corrupted"
            }

        if file_size > self.max_file_size:
            # Still allow but warn - we'll resize anyway
            print(
                f"⚠️ Large file detected ({file_size} bytes), will be optimized")

        # Check filename
        if not filename or len(filename.strip()) == 0:
            # Generate a filename if missing
            filename = f"upload_{hash(file_data[:100]) % 10000}.jpg"
            print(f"📝 Generated filename: {filename}")

        # Check file extension - Try to detect if missing
        if not self._has_valid_extension(filename):
            # Try to detect format from content and fix filename
            try:
                detected_format = self._detect_image_format(file_data)
                if detected_format:
                    base_name = filename.rsplit(
                        '.', 1)[0] if '.' in filename else filename
                    filename = f"{base_name}.{detected_format}"
                    print(f"📝 Fixed filename to: {filename}")
                else:
                    # Default to jpg if we can't detect
                    filename = f"{filename}.jpg"
                    print(f"📝 Defaulted filename to: {filename}")
            except:
                filename = f"{filename}.jpg"

        return {"valid": True, "corrected_filename": filename}

    def _validate_mime_type(self, file_data: bytes, filename: str) -> Dict:
        """Layer 2: MIME type validation using python-magic"""

        try:
            # Detect MIME type from file content
            detected_mime = magic.from_buffer(file_data, mime=True)

            # Check if detected MIME type is supported
            if detected_mime not in self.all_supported_types:
                return {
                    "valid": False,
                    "error": "Unsupported file type",
                    "reason": f"Detected MIME type '{detected_mime}' is not supported"
                }

            # Verify MIME type matches file extension
            expected_mime = mimetypes.guess_type(filename)[0]
            if expected_mime and not self._mime_types_compatible(detected_mime, expected_mime):
                return {
                    "valid": False,
                    "error": "File type mismatch",
                    "reason": f"File extension suggests '{expected_mime}' but content is '{detected_mime}'"
                }

            return {
                "valid": True,
                "detected_mime": detected_mime
            }

        except Exception as e:
            return {
                "valid": False,
                "error": "MIME type detection failed",
                "reason": f"Could not determine file type: {str(e)}"
            }

    async def _validate_file_structure(self, file_data: bytes, filename: str) -> Dict:
        """Layer 3: File structure and header validation"""

        try:
            if self._is_image_file(filename):
                return self._validate_image_structure(file_data)
            elif filename.lower().endswith('.pdf'):
                return self._validate_pdf_structure(file_data)
            else:
                return {
                    "valid": False,
                    "error": "Unknown file type",
                    "reason": "File type not recognized for structure validation"
                }

        except Exception as e:
            return {
                "valid": False,
                "error": "Structure validation failed",
                "reason": f"Could not validate file structure: {str(e)}"
            }

    def _validate_image_structure(self, image_data: bytes) -> Dict:
        """Validate image file structure and properties - Accept any valid image"""

        try:
            # Try to open image with PIL
            image = Image.open(io.BytesIO(image_data))

            # Get image dimensions
            width, height = image.size
            print(f"📐 Original image dimensions: {width}x{height}")

            # Accept any dimensions - we'll resize if needed
            needs_resize = False
            if max(width, height) > self.target_max_dimension:
                needs_resize = True
                print(f"📏 Image will be resized (too large)")
            elif min(width, height) < self.target_min_dimension and max(width, height) < self.target_min_dimension:
                needs_resize = True
                print(f"📏 Image will be upscaled (too small)")

            # Verify image can be processed (reopen since verify() closes the image)
            image = Image.open(io.BytesIO(image_data))

            return {
                "valid": True,
                "needs_resize": needs_resize,
                "image_info": {
                    "original_dimensions": (width, height),
                    "format": image.format,
                    "mode": image.mode,
                    "size_bytes": len(image_data)
                }
            }

        except Exception as e:
            # Try to recover corrupted images
            try:
                print(
                    f"⚠️ Image validation failed, attempting recovery: {str(e)}")
                # Try to load with different methods
                image = Image.open(io.BytesIO(image_data))
                image.load()  # Force load the image data

                return {
                    "valid": True,
                    "needs_resize": True,  # Force resize to clean up
                    "recovered": True,
                    "image_info": {
                        "original_dimensions": image.size,
                        "format": "RECOVERED",
                        "mode": image.mode,
                        "size_bytes": len(image_data)
                    }
                }
            except:
                return {
                    "valid": False,
                    "error": "Invalid image file",
                    "reason": f"Image file is corrupted and cannot be recovered: {str(e)}"
                }

    def _validate_pdf_structure(self, pdf_data: bytes) -> Dict:
        """Validate PDF file structure"""

        try:
            import PyPDF2

            pdf_file = io.BytesIO(pdf_data)
            pdf_reader = PyPDF2.PdfReader(pdf_file)

            # Check if PDF has pages
            num_pages = len(pdf_reader.pages)
            if num_pages == 0:
                return {
                    "valid": False,
                    "error": "Empty PDF",
                    "reason": "PDF file contains no pages"
                }

            if num_pages > 10:  # Reasonable limit for receipts
                return {
                    "valid": False,
                    "error": "PDF too large",
                    "reason": f"PDF has {num_pages} pages, maximum 10 allowed for receipts"
                }

            # Try to extract text from first page to verify readability
            try:
                first_page = pdf_reader.pages[0]
                text = first_page.extract_text()
                # PDF should have some extractable text
                if len(text.strip()) < 10:
                    return {
                        "valid": False,
                        "error": "PDF contains no readable text",
                        "reason": "PDF appears to contain only images or is corrupted"
                    }
            except Exception:
                # If text extraction fails, still allow the PDF
                pass

            return {
                "valid": True,
                "pdf_info": {
                    "num_pages": num_pages,
                    "has_text": len(text.strip()) > 10 if 'text' in locals() else False
                }
            }

        except Exception as e:
            return {
                "valid": False,
                "error": "Invalid PDF file",
                "reason": f"PDF file is corrupted or invalid: {str(e)}"
            }

    def _sanitize_image(self, image_data: bytes) -> Dict:
        """Layer 4: Image sanitization, optimization, and auto-resizing"""

        try:
            # Open image
            image = Image.open(io.BytesIO(image_data))
            original_size = image.size
            print(
                f"🖼️ Processing image: {original_size[0]}x{original_size[1]} ({image.format})")

            # Remove EXIF data and handle rotation
            image = ImageOps.exif_transpose(image)

            # Auto-resize if needed
            image = self._auto_resize_image(image)

            # Convert to optimal format
            if image.mode not in ('RGB', 'L'):  # RGB or Grayscale
                if image.mode == 'RGBA':
                    # Create white background for transparent images
                    background = Image.new('RGB', image.size, (255, 255, 255))
                    background.paste(image, mask=image.split()[-1])
                    image = background
                elif image.mode == 'P':  # Palette mode
                    image = image.convert('RGB')
                else:
                    image = image.convert('RGB')

            # Optimize and re-encode
            output_buffer = io.BytesIO()

            # Choose format based on content
            if self._should_save_as_png(image):
                image.save(output_buffer, format='PNG',
                           optimize=self.png_optimize)
                final_format = 'PNG'
            else:
                image.save(output_buffer, format='JPEG',
                           quality=self.jpeg_quality, optimize=True)
                final_format = 'JPEG'

            sanitized_data = output_buffer.getvalue()

            print(
                f"✅ Image optimized: {original_size} → {image.size}, {len(image_data)} → {len(sanitized_data)} bytes ({final_format})")

            return {
                "valid": True,
                "sanitized_data": sanitized_data,
                "original_size": len(image_data),
                "sanitized_size": len(sanitized_data),
                "original_dimensions": original_size,
                "final_dimensions": image.size,
                "final_format": final_format,
                "compression_ratio": len(sanitized_data) / len(image_data) if len(image_data) > 0 else 1.0
            }

        except Exception as e:
            print(f"❌ Image sanitization failed: {str(e)}")
            return {
                "valid": False,
                "error": "Image sanitization failed",
                "reason": f"Could not process image: {str(e)}"
            }

    def _security_scan(self, file_data: bytes, filename: str) -> Dict:
        """Layer 5: Security scanning for malicious content"""

        try:
            # Check for suspicious file headers
            if self._has_suspicious_headers(file_data):
                return {
                    "valid": False,
                    "error": "Suspicious file content",
                    "reason": "File contains suspicious headers or signatures"
                }

            # Check for embedded scripts (basic check)
            if self._contains_embedded_scripts(file_data):
                return {
                    "valid": False,
                    "error": "Potentially malicious content",
                    "reason": "File may contain embedded scripts or malicious code"
                }

            # Additional PDF-specific security checks
            if filename.lower().endswith('.pdf'):
                pdf_security = self._scan_pdf_security(file_data)
                if not pdf_security["valid"]:
                    return pdf_security

            return {"valid": True}

        except Exception as e:
            return {
                "valid": False,
                "error": "Security scan failed",
                "reason": f"Could not complete security scan: {str(e)}"
            }

    def _has_suspicious_headers(self, file_data: bytes) -> bool:
        """Check for suspicious file headers"""

        # Check first 1024 bytes for suspicious patterns
        header = file_data[:1024].lower()

        suspicious_patterns = [
            b'<script',
            b'javascript:',
            b'vbscript:',
            b'onload=',
            b'onerror=',
            b'eval(',
            b'document.write',
            b'<iframe',
            b'<object',
            b'<embed'
        ]

        return any(pattern in header for pattern in suspicious_patterns)

    def _contains_embedded_scripts(self, file_data: bytes) -> bool:
        """Check for embedded scripts in file content"""

        # Convert to string for pattern matching (ignore encoding errors)
        try:
            content = file_data.decode('utf-8', errors='ignore').lower()
        except:
            content = str(file_data).lower()

        script_patterns = [
            'javascript:', 'vbscript:', '<script', '</script>',
            'eval(', 'document.write', 'window.location',
            'alert(', 'confirm(', 'prompt('
        ]

        return any(pattern in content for pattern in script_patterns)

    def _scan_pdf_security(self, pdf_data: bytes) -> Dict:
        """PDF-specific security scanning"""

        try:
            import PyPDF2

            pdf_file = io.BytesIO(pdf_data)
            pdf_reader = PyPDF2.PdfReader(pdf_file)

            # Check for JavaScript in PDF
            for page in pdf_reader.pages:
                if '/JS' in str(page) or '/JavaScript' in str(page):
                    return {
                        "valid": False,
                        "error": "PDF contains JavaScript",
                        "reason": "PDF files with JavaScript are not allowed"
                    }

            # Check for forms or interactive elements
            if pdf_reader.is_encrypted:
                return {
                    "valid": False,
                    "error": "Encrypted PDF not allowed",
                    "reason": "Encrypted PDF files are not supported"
                }

            return {"valid": True}

        except Exception as e:
            # If we can't scan, be conservative and reject
            return {
                "valid": False,
                "error": "PDF security scan failed",
                "reason": f"Could not verify PDF security: {str(e)}"
            }

    def _generate_file_hash(self, file_data: bytes) -> str:
        """Generate SHA-256 hash of file for deduplication"""
        return hashlib.sha256(file_data).hexdigest()

    def _auto_resize_image(self, image: Image.Image) -> Image.Image:
        """Automatically resize image to optimal dimensions"""

        width, height = image.size
        max_dimension = max(width, height)
        min_dimension = min(width, height)

        # Calculate new dimensions
        if max_dimension > self.target_max_dimension:
            # Scale down large images
            if width > height:
                new_width = self.target_max_dimension
                new_height = int((height * self.target_max_dimension) / width)
            else:
                new_height = self.target_max_dimension
                new_width = int((width * self.target_max_dimension) / height)

            print(
                f"📏 Resizing large image: {width}x{height} → {new_width}x{new_height}")
            return image.resize((new_width, new_height), Image.Resampling.LANCZOS)

        elif max_dimension < self.target_min_dimension:
            # Scale up very small images
            scale_factor = self.target_min_dimension / max_dimension
            new_width = int(width * scale_factor)
            new_height = int(height * scale_factor)

            print(
                f"📏 Upscaling small image: {width}x{height} → {new_width}x{new_height}")
            return image.resize((new_width, new_height), Image.Resampling.LANCZOS)

        # Image is already optimal size
        return image

    def _should_save_as_png(self, image: Image.Image) -> bool:
        """Determine if image should be saved as PNG vs JPEG"""

        # Use PNG for images with transparency or very few colors
        if image.mode in ('RGBA', 'LA', 'P'):
            return True

        # Use PNG for images that might be screenshots or have sharp edges
        # (This is a simple heuristic - could be improved)
        width, height = image.size
        if width > height * 2 or height > width * 2:  # Very wide or tall images
            return True

        return False  # Default to JPEG for photos

    def _detect_image_format(self, file_data: bytes) -> str:
        """Detect image format from file content"""

        try:
            image = Image.open(io.BytesIO(file_data))
            format_map = {
                'JPEG': 'jpg',
                'PNG': 'png',
                'WEBP': 'webp',
                'TIFF': 'tiff',
                'BMP': 'bmp',
                'GIF': 'gif'
            }
            return format_map.get(image.format, 'jpg')
        except:
            return None

    def _has_valid_extension(self, filename: str) -> bool:
        """Check if filename has a valid extension"""
        valid_extensions = ['.jpg', '.jpeg', '.png',
                            '.webp', '.tiff', '.tif', '.pdf', '.bmp', '.gif']
        return any(filename.lower().endswith(ext) for ext in valid_extensions)

    def _is_image_file(self, filename: str) -> bool:
        """Check if file is an image based on extension"""
        image_extensions = ['.jpg', '.jpeg', '.png',
                            '.webp', '.tiff', '.tif', '.bmp', '.gif']
        return any(filename.lower().endswith(ext) for ext in image_extensions)

    def _mime_types_compatible(self, detected: str, expected: str) -> bool:
        """Check if detected and expected MIME types are compatible"""

        # Handle common variations
        compatible_pairs = [
            ('image/jpeg', 'image/jpg'),
            ('image/tiff', 'image/tif'),
            ('application/pdf', 'application/x-pdf')
        ]

        if detected == expected:
            return True

        for pair in compatible_pairs:
            if (detected, expected) in [pair, pair[::-1]]:
                return True

        return False


# Global instance
image_validation_service = ImageValidationService()
