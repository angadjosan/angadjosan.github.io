# Website Misclassification Prevention Guidelines

**Date:** January 9, 2026  
**Purpose:** Guidelines to prevent website misclassification by content filters and automated scanners

---

## Overview

This document outlines steps taken to improve angadjosan.com and reduce the likelihood of it being misclassified by automated content filters, parental controls, or security scanners.

---

## Step 1: Clear, Safe Signals on Homepage

### Implementation
- **Added prominent descriptive text** above the fold on the homepage
- Text clearly states: "Personal portfolio website of Angad Josan, showcasing academic projects, technical work, and professional experience."
- This text appears in bold at the top of the bio section for maximum visibility to automated scanners

### Rationale
- Automated scanners rely heavily on visible text, not just images
- Clear professional context helps categorization algorithms
- First-impression text sets the tone for the entire site

---

## Step 2: Trust & Legal Pages

### Pages Created

#### 1. About Page (`about.html`)
- **Purpose:** Provides comprehensive background about the site owner
- **Content includes:**
  - Professional focus and expertise areas
  - Academic background (UC Berkeley EECS)
  - Skills and interests (AI, software engineering, etc.)
  - Clear statement about the site's purpose
- **Why it helps:** Establishes legitimacy and professional context

#### 2. Contact Page (`contact.html`)
- **Purpose:** Provides legitimate contact methods and professional inquiry information
- **Content includes:**
  - Primary email contact
  - Response time expectations
  - Social media links (LinkedIn, GitHub, X/Twitter)
  - Clear statement about appropriate contact purposes
  - Disclaimer about professional use only
- **Why it helps:** Shows accountability and transparency

#### 3. Privacy Policy Page (`privacy-policy.html`)
- **Purpose:** Standard privacy documentation
- **Content includes:**
  - Statement about data collection (none on this static site)
  - GitHub Pages hosting disclosure
  - External links policy
  - Contact information handling
  - Children's privacy statement
  - Last updated date
- **Why it helps:** Legal pages are strong trust signals for automated scanners

### Navigation Updates
- Added "about" and "contact" links to main navigation
- Privacy policy accessible from all legal pages
- Consistent navigation across all pages

---

## Step 3: Content & Image Safety

### Current Status
✅ Site already has strong professional content:
- Clear professional headshot
- Academic and work focus
- Technical project descriptions
- No ambiguous or artistic imagery

### Best Practices Going Forward

#### Images
- ✅ Keep professional headshot
- ✅ Add alt text to all images (already implemented)
- ⚠️ If adding new images: Include explanatory captions
- ⚠️ Avoid: Abstract art, ambiguous photography without context

#### Text Content
- ✅ Maintain professional language
- ✅ Keep bio descriptive and context-rich
- ⚠️ Avoid: Short bios without context, vague descriptions
- ⚠️ If using technical jargon: Add brief explanations

#### Keywords to Avoid
- Anything ambiguous that could be misinterpreted
- Adult-oriented terminology (even in technical contexts)
- Excessive use of uncommon abbreviations without explanation

---

## Step 4: Technical SEO & Meta Tags

### Current Implementation
- ✅ Proper HTML5 structure
- ✅ Semantic HTML elements
- ⚠️ **Consider adding:** More comprehensive meta tags

### Recommended Meta Tags
```html
<meta name="description" content="Professional portfolio of Angad Singh Josan - EECS student at UC Berkeley">
<meta name="keywords" content="portfolio, software engineer, EECS, UC Berkeley, AI, machine learning">
<meta name="author" content="Angad Singh Josan">
<meta name="robots" content="index, follow">
```

### Schema Markup (Optional Enhancement)
Consider adding JSON-LD structured data for better classification:
```json
{
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "Angad Singh Josan",
  "jobTitle": "Student, EECS",
  "affiliation": {
    "@type": "CollegeOrUniversity",
    "name": "University of California, Berkeley"
  },
  "url": "https://angadjosan.com"
}
```

---

## Step 5: Ongoing Monitoring

### Regular Checks
- [ ] Test site with SafeSearch enabled on major search engines
- [ ] Check classification on VirusTotal or similar services
- [ ] Review site through parental control software
- [ ] Monitor any bounce rate anomalies or access issues

### Update Schedule
- Review content quarterly
- Update privacy policy annually or when practices change
- Keep professional information current
- Refresh project showcases regularly

---

## Key Takeaways

### What Helps Prevent Misclassification
1. **Clear professional context** visible immediately
2. **Trust signals** (about, contact, privacy pages)
3. **Descriptive text** throughout the site
4. **Professional imagery** with context
5. **Standard website structure** and navigation
6. **Legal/policy pages** that demonstrate accountability

### What to Avoid
1. Ambiguous imagery without explanation
2. Sparse text content
3. Missing standard pages (about, contact)
4. Unprofessional or unclear language
5. Broken links or incomplete sections
6. No contact information or accountability

---

## File Structure After Implementation

```
/
├── index.html              (Updated with clear description)
├── work.html               (Existing)
├── projects.html           (Existing)
├── about.html              (NEW - Professional background)
├── contact.html            (NEW - Contact information)
├── privacy-policy.html     (NEW - Privacy documentation)
├── CNAME
├── images/
└── IMPLEMENTATION_GUIDELINES.md (This file)
```

---

## References & Resources

- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [Google SafeSearch Guidelines](https://support.google.com/websearch/answer/510)
- [Schema.org Person Type](https://schema.org/Person)
- [Web Content Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

---

## Version History

- **v1.0 (January 9, 2026)**: Initial implementation of misclassification prevention measures
  - Added clear homepage description
  - Created about, contact, and privacy policy pages
  - Updated navigation structure
  - Documented guidelines and best practices

---

**Note:** These guidelines should be reviewed and updated regularly as web standards and classification algorithms evolve.
