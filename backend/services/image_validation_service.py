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
        # File size limits
        self.min_file_size = 1024  # 1KB
        self.max_file_size = 10 * 1024 * 1024  # 10MB

        # Supported formats
        self.supported_image_types = {
            'image/jpeg', 'image/jpg', 'image/png',
            'image/webp', 'image/tiff', 'image/tif'
        }
        self.supported_document_types = {'application/pdf'}
        self.all_supported_types = self.supported_image_types | self.supported_document_types

        # Image constraints
        self.max_image_dimensions = (4000, 4000)  # Max width/height
        self.min_image_dimensions = (100, 100)    # Min width/height

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
        """Layer 1: Basic file property validation"""

        # Check file size
        file_size = len(file_data)
        if file_size < self.min_file_size:
            return {
                "valid": False,
                "error": "File too small",
                "reason": f"File size ({file_size} bytes) is below minimum ({self.min_file_size} bytes)"
            }

        if file_size > self.max_file_size:
            return {
                "valid": False,
                "error": "File too large",
                "reason": f"File size ({file_size} bytes) exceeds maximum ({self.max_file_size} bytes)"
            }

        # Check filename
        if not filename or len(filename.strip()) == 0:
            return {
                "valid": False,
                "error": "Invalid filename",
                "reason": "Filename is empty or invalid"
            }

        # Check file extension
        if not self._has_valid_extension(filename):
            return {
                "valid": False,
                "error": "Unsupported file type",
                "reason": "File extension not supported. Use JPEG, PNG, WebP, TIFF, or PDF"
            }

        return {"valid": True}

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
        """Validate image file structure and properties"""

        try:
            # Try to open image with PIL
            image = Image.open(io.BytesIO(image_data))

            # Check image dimensions
            width, height = image.size

            if width < self.min_image_dimensions[0] or height < self.min_image_dimensions[1]:
                return {
                    "valid": False,
                    "error": "Image too small",
                    "reason": f"Image dimensions ({width}x{height}) below minimum {self.min_image_dimensions}"
                }

            if width > self.max_image_dimensions[0] or height > self.max_image_dimensions[1]:
                return {
                    "valid": False,
                    "error": "Image too large",
                    "reason": f"Image dimensions ({width}x{height}) exceed maximum {self.max_image_dimensions}"
                }

            # Verify image can be processed
            image.verify()

            return {
                "valid": True,
                "image_info": {
                    "dimensions": (width, height),
                    "format": image.format,
                    "mode": image.mode
                }
            }

        except Exception as e:
            return {
                "valid": False,
                "error": "Invalid image file",
                "reason": f"Image file is corrupted or invalid: {str(e)}"
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
        """Layer 4: Image sanitization and re-encoding"""

        try:
            # Open image
            image = Image.open(io.BytesIO(image_data))

            # Remove EXIF data and other metadata
            image = ImageOps.exif_transpose(image)  # Handle rotation

            # Convert to RGB if necessary (removes alpha channel, etc.)
            if image.mode not in ('RGB', 'L'):  # RGB or Grayscale
                if image.mode == 'RGBA':
                    # Create white background for transparent images
                    background = Image.new('RGB', image.size, (255, 255, 255))
                    # Use alpha channel as mask
                    background.paste(image, mask=image.split()[-1])
                    image = background
                else:
                    image = image.convert('RGB')

            # Re-encode image to remove potential exploits
            output_buffer = io.BytesIO()

            # Save as JPEG with reasonable quality
            image.save(output_buffer, format='JPEG', quality=85, optimize=True)
            sanitized_data = output_buffer.getvalue()

            return {
                "valid": True,
                "sanitized_data": sanitized_data,
                "original_size": len(image_data),
                "sanitized_size": len(sanitized_data)
            }

        except Exception as e:
            return {
                "valid": False,
                "error": "Image sanitization failed",
                "reason": f"Could not sanitize image: {str(e)}"
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

    def _has_valid_extension(self, filename: str) -> bool:
        """Check if filename has a valid extension"""
        valid_extensions = ['.jpg', '.jpeg', '.png',
                            '.webp', '.tiff', '.tif', '.pdf']
        return any(filename.lower().endswith(ext) for ext in valid_extensions)

    def _is_image_file(self, filename: str) -> bool:
        """Check if file is an image based on extension"""
        image_extensions = ['.jpg', '.jpeg', '.png', '.webp', '.tiff', '.tif']
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
