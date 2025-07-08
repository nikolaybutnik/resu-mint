import { STORAGE_KEYS } from '../constants'
import { DEFAULT_STATE_VALUES } from '../constants'
import { JobDescriptionAnalysis } from '../types/api'
import { JobDetails } from '../types/jobDetails'
import { jobDetailsSchema } from '../validationSchemas'
import {
  isAuthenticated,
  isLocalStorageAvailable,
  isQuotaExceededError,
} from './dataUtils'

const CACHE_KEYS = {
  JOB_DETAILS_LOCAL: 'job-details-local',
  JOB_DETAILS_API: 'job-details-api',
} as const

class JobDetailsManager {
  private cache = new Map<string, Promise<unknown>>()

  async get(): Promise<JobDetails> {
    const cacheKey = isAuthenticated()
      ? CACHE_KEYS.JOB_DETAILS_API
      : CACHE_KEYS.JOB_DETAILS_LOCAL

    if (!this.cache.has(cacheKey)) {
      const promise = new Promise<JobDetails>((resolve) => {
        try {
          const stored = localStorage.getItem(STORAGE_KEYS.JOB_DETAILS)

          if (stored) {
            const parsed = JSON.parse(stored)
            const validation = jobDetailsSchema.safeParse(parsed)

            if (validation.success) {
              resolve(validation.data)
            } else {
              console.warn(
                'Invalid job details in Local Storage, using defaults:',
                validation.error
              )
              resolve(DEFAULT_STATE_VALUES.JOB_DETAILS)
            }
          } else {
            resolve(DEFAULT_STATE_VALUES.JOB_DETAILS)
          }
        } catch (error) {
          console.error('Error loading job details, using defaults:', error)
          resolve(DEFAULT_STATE_VALUES.JOB_DETAILS)
        }
      })
      this.cache.set(cacheKey, promise)
    }

    return await (this.cache.get(cacheKey)! as Promise<JobDetails>)
  }

  async saveJobDescription(data: string): Promise<void> {
    this.invalidate()

    if (!isLocalStorageAvailable()) {
      console.warn(
        'Local Storage not available, data will not persist across sessions'
      )

      const cacheKey = isAuthenticated()
        ? CACHE_KEYS.JOB_DETAILS_API
        : CACHE_KEYS.JOB_DETAILS_LOCAL

      this.cache.set(cacheKey, Promise.resolve(data))
      return
    }

    try {
      localStorage.setItem(
        STORAGE_KEYS.JOB_DETAILS,
        JSON.stringify({
          ...(await this.get()),
          originalJobDescription: data,
        })
      )
    } catch (error) {
      if (isQuotaExceededError(error)) {
        console.warn('Local Storage quota exceeded')
        throw new Error('Storage quota exceeded. Please clear browser data.')
      }
      throw error
    }
  }

  async saveAnalysis(data: JobDescriptionAnalysis): Promise<void> {
    this.invalidate()

    if (!isLocalStorageAvailable()) {
      console.warn(
        'Local Storage not available, data will not persist across sessions'
      )

      const cacheKey = isAuthenticated()
        ? CACHE_KEYS.JOB_DETAILS_API
        : CACHE_KEYS.JOB_DETAILS_LOCAL

      this.cache.set(cacheKey, Promise.resolve(data))
      return
    }

    try {
      localStorage.setItem(
        STORAGE_KEYS.JOB_DETAILS,
        JSON.stringify({ ...(await this.get()), analysis: data })
      )
    } catch (error) {
      if (isQuotaExceededError(error)) {
        console.warn('Local Storage quota exceeded')
        throw new Error('Storage quota exceeded. Please clear browser data.')
      }
      throw error
    }
  }

  invalidate() {
    this.cache.delete(CACHE_KEYS.JOB_DETAILS_LOCAL)
    this.cache.delete(CACHE_KEYS.JOB_DETAILS_API)
  }
}

export const jobDetailsManager = new JobDetailsManager()

/* 
Tier 3 Support Engineer - Intermediate
Job Category: APP DEV
Requisition Number: TIER3001181
 
Posting Details
Posted: April 1, 2025
Full-Time
Hybrid
LocationsShowing 1 location
Ottawa, ON K2M1X3, CAN
Job Details
Description
At JSI, we are dedicated to empowering public safety organizations worldwide with cutting-edge, AI-enabled analytics solutions. Our flagship platform, 4Sight, seamlessly integrates and analyzes data from diverse sources to provide actionable insights that enhance situational awareness and operational effectiveness. With a legacy spanning over 45 years and deployments in more than 30 countries across six continents, JSI has been instrumental in preventing terrorist activities, combating narcotics trafficking, and reuniting missing children with their families. By joining our Tier 3 Support team, you will be crucial in maintaining and advancing these mission-critical systems, directly contributing to global safety and security.

The Tier 3 Support Engineer - intermediate  is responsible for diagnosing, resolving, and preventing software issues reported by customers and internal teams. They work closely with technical support, developers, QA, and product managers to maintain the stability and reliability of released software while delivering hotfixes and service packs.

Responsibilities:

Incident Resolution & Root Cause Analysis

Analyze, debug, and resolve complex software issues reported by technical support (TS) or customers.
Conduct root cause analysis (RCA) and document findings to prevent recurrence.
Work closely with the development team to escalate unresolved product defects.
Hotfix & Service Pack Development

Develop and test hotfixes for critical customer-reported bugs.
Package and release service packs for supported software versions.
Ensure fixes are compatible across different versions and do not introduce regressions.
Code Maintenance & Technical Debt Reduction

Modify and improve existing codebases while ensuring minimal disruption to production systems.
Address technical debt in released software to enhance maintainability and performance.
Implement security patches and compliance updates as required.
Customer-Facing Technical Support (TS)

Work with TS teams to provide detailed technical explanations and solutions.
Participate in customer calls when needed to assist in troubleshooting high-priority issues.
Guide TS teams on resolving recurring issues.
Monitoring & Incident Management

Monitor system logs, performance metrics, and error reports to identify potential problems proactively.
Participate in incident response efforts for major outages or critical system failures.
Contribute to the development of automated monitoring tools and dashboards.
Knowledge Management & Documentation

Maintain detailed documentation of issues, solutions, and best practices.
Write knowledge base articles and internal troubleshooting guides.
Contribute to postmortem reports after major incidents.
Collaboration & Continuous Improvement

Work closely with QA teams to define test cases for fixed defects.
Provide feedback to the development team on recurring issues and areas for product improvement.
Participate in retrospectives to improve the support workflow and processes.
24/7 Emergency Support Rotation

Participate in an on-call rotation to provide emergency support for high-priority incidents.
Quickly assess and triage critical failures, coordinating with development and operations teams as needed.
Skills

3-5 years of previous experience in a similar role.
Programming Languages – Proficiency in multiple of the following languages: Java, C#, Python, JavaScript, Ruby, and C++.
Debugging & Troubleshooting – Strong ability to use debugger and analyze logs, stack traces, and performance metrics to diagnose issues.
Software Development – Experience with maintaining and modifying existing codebases while ensuring stability.
Database Knowledge – Proficiency in SQL and working with relational and/or NoSQL (Cassandra) databases.
Version Control – Familiarity with Git, branching strategies, and code reviews.
Operating Systems & Networking – Knowledge of Linux and Windows environments, including shell scripting, networking concepts, and basic system administration.
API & Web Services – Understanding of RESTful APIs, microservices, and tools like Postman for API testing.
Cloud & Infrastructure – Experience with containerization (Docker, Kubernetes) is required, and knowledge of cloud platforms (AWS, Azure, GCP) is a plus.
CI/CD & Automation – Familiarity with Jenkins, GitHub Actions, or other CI/CD pipelines to deploy hotfixes and updates efficiently.
Testing & QA – Ability to write and execute unit tests, integration tests, and regression tests to validate fixes.
Problem-Solving – Ability to think critically, analyze issues systematically, and develop effective solutions.
Communication – Strong written and verbal communication skills for documenting fixes and explaining technical issues to non-technical stakeholders.
Collaboration – Experience working closely with developers, QA, and customer support teams.
Adaptability – Ability to work under pressure in a fast-paced, customer-driven environment.
Attention to Detail – Ensuring fixes are robust, do not introduce regressions, and meet compliance/security standards.
Customer-Focused – Willingness to engage directly with customers or support teams to provide timely resolutions.
Time Management – Ability to prioritize tasks efficiently, balancing emergency issues with long-term improvements.
Ownership & Accountability – Taking full responsibility for issues from initial report to final resolution.

How We Work

You will be expected to work in a remote/hybrid environment reporting to our Kanata, Ontario location 2 or more times per week.

About JSI

JSI is built on purpose, that of making a difference in the world.

Founded in 1979, this privately-owned technology company is the North American leader in designing and developing acquisition, collection and analysis solutions for law enforcement and intelligence communities.

With 4Sight – JSI’s single, unified, product suite – customers can combine any number of disparate data sources into a highly intuitive, visually-focused platform. The result? JSI’s customers spend less time working with data and more time seeing patterns, understanding trends, and gaining perspective (and making the world a safer place).

With over 400 employees and a strong, growing global presence in Canada, the U.S., Australia and Germany, JSI is not only the dominant player in its industry, it is also known for its fun, high-performing, purpose-driven corporate culture.

In accordance with the Accessibility for Ontarians with Disabilities Act (AODA), JSI will provide accommodation accessible formats and communication supports for the interview process upon request.
*/
