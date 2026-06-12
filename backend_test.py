#!/usr/bin/env python3
"""
Backend API Tests for Square Associates Private Company Intelligence Platform
Tests all endpoints with proper validation of JSON structure and response times.
"""

import requests
import json
import time
from datetime import datetime

# Load base URL from .env
BASE_URL = "https://valuation-hub-55.preview.emergentagent.com/api"
TIMEOUT = 120  # 120 seconds for analyze endpoint

def print_test_header(test_name):
    print(f"\n{'='*80}")
    print(f"TEST: {test_name}")
    print(f"{'='*80}")

def print_success(message):
    print(f"✅ SUCCESS: {message}")

def print_error(message):
    print(f"❌ FAILURE: {message}")

def print_info(message):
    print(f"ℹ️  INFO: {message}")

def validate_financial_metric(metric, metric_name):
    """Validate that a financial metric has all required fields"""
    required_fields = ['value', 'type', 'confidence', 'source_count', 'last_updated', 'source_notes']
    missing = [f for f in required_fields if f not in metric]
    if missing:
        print_error(f"{metric_name} missing fields: {missing}")
        return False
    
    # Validate type is one of the expected values
    if metric['type'] not in ['actual', 'derived', 'ai_estimated']:
        print_error(f"{metric_name} has invalid type: {metric['type']}")
        return False
    
    print_success(f"{metric_name} has all required fields")
    return True

def validate_comparable(comp, index):
    """Validate a comparable company structure"""
    required_fields = ['name', 'country', 'sector', 'industry', 'revenue_usd_m', 
                      'ebitda_usd_m', 'enterprise_value_usd_m', 'ev_revenue', 
                      'ev_ebitda', 'employees', 'rationale']
    missing = [f for f in required_fields if f not in comp]
    if missing:
        print_error(f"Comparable #{index} missing fields: {missing}")
        return False
    return True

def test_1_root_endpoint():
    """Test 1: GET /api/root → expect {"message":"Square Associates Intelligence API"}"""
    print_test_header("Test 1: GET /api/root")
    
    try:
        response = requests.get(f"{BASE_URL}/root", timeout=10)
        print_info(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print_error(f"Expected status 200, got {response.status_code}")
            return False
        
        data = response.json()
        print_info(f"Response: {json.dumps(data, indent=2)}")
        
        if data.get('message') == 'Square Associates Intelligence API':
            print_success("Root endpoint returned correct message")
            return True
        else:
            print_error(f"Expected message 'Square Associates Intelligence API', got: {data.get('message')}")
            return False
            
    except Exception as e:
        print_error(f"Exception occurred: {str(e)}")
        return False

def test_2_analyze_new_company():
    """Test 2: POST /api/analyze with {"company_name":"Stripe"} - First call (uncached)"""
    print_test_header("Test 2: POST /api/analyze - New Company (Stripe)")
    
    try:
        payload = {"company_name": "Stripe"}
        print_info(f"Payload: {json.dumps(payload)}")
        print_info("Calling API with 120s timeout (may take 25-90s)...")
        
        start_time = time.time()
        response = requests.post(f"{BASE_URL}/analyze", json=payload, timeout=TIMEOUT)
        elapsed = time.time() - start_time
        
        print_info(f"Status Code: {response.status_code}")
        print_info(f"Response Time: {elapsed:.2f}s")
        
        if response.status_code != 200:
            print_error(f"Expected status 200, got {response.status_code}")
            print_error(f"Response: {response.text}")
            return False, None
        
        data = response.json()
        
        # Check top-level fields
        required_top_fields = ['id', 'key', 'company_name', 'context', 'analysis', 'created_at', 'cached']
        missing_top = [f for f in required_top_fields if f not in data]
        if missing_top:
            print_error(f"Missing top-level fields: {missing_top}")
            return False, None
        
        print_success(f"All top-level fields present")
        print_info(f"ID: {data['id']}")
        print_info(f"Cached: {data['cached']}")
        
        if data['cached'] != False:
            print_error(f"Expected cached=false for first call, got {data['cached']}")
        
        analysis = data['analysis']
        
        # Validate company section
        if 'company' not in analysis:
            print_error("Missing 'company' section in analysis")
            return False, None
        
        company = analysis['company']
        company_fields = ['name', 'sector', 'industry', 'sub_industry', 'country', 
                         'region', 'continent', 'headquarters', 'employees', 
                         'year_founded', 'description']
        missing_company = [f for f in company_fields if f not in company]
        if missing_company:
            print_error(f"Missing company fields: {missing_company}")
        else:
            print_success("Company section has all required fields")
        
        # Validate financials section
        if 'financials' not in analysis:
            print_error("Missing 'financials' section in analysis")
            return False, None
        
        financials = analysis['financials']
        financial_metrics = ['revenue_usd_m', 'ebitda_usd_m', 'ebit_usd_m', 
                            'net_income_usd_m', 'enterprise_value_usd_m', 
                            'funding_raised_usd_m', 'estimated_valuation_usd_m']
        
        all_metrics_valid = True
        for metric_name in financial_metrics:
            if metric_name in financials:
                if not validate_financial_metric(financials[metric_name], metric_name):
                    all_metrics_valid = False
            else:
                print_info(f"Optional metric {metric_name} not present")
        
        # Validate last_funding_round if present
        if 'last_funding_round' in financials:
            lfr = financials['last_funding_round']
            lfr_fields = ['round_type', 'amount_usd_m', 'date', 'lead_investors']
            missing_lfr = [f for f in lfr_fields if f not in lfr]
            if missing_lfr:
                print_error(f"last_funding_round missing fields: {missing_lfr}")
            else:
                print_success("last_funding_round has all required fields")
        
        # Validate multiples section
        if 'multiples' not in analysis:
            print_error("Missing 'multiples' section in analysis")
        else:
            multiples = analysis['multiples']
            multiples_fields = ['ev_revenue', 'ev_ebitda', 'revenue_growth_pct', 
                               'ebitda_margin_pct', 'profit_margin_pct']
            missing_multiples = [f for f in multiples_fields if f not in multiples]
            if missing_multiples:
                print_error(f"Missing multiples fields: {missing_multiples}")
            else:
                print_success("Multiples section has all required fields")
        
        # Validate comparables section - MUST BE EXACTLY 10
        if 'comparables' not in analysis:
            print_error("Missing 'comparables' section in analysis")
            return False, None
        
        comparables = analysis['comparables']
        if not isinstance(comparables, list):
            print_error(f"Comparables should be a list, got {type(comparables)}")
            return False, None
        
        if len(comparables) != 10:
            print_error(f"Expected exactly 10 comparables, got {len(comparables)}")
            return False, None
        
        print_success(f"Comparables section has exactly 10 items")
        
        all_comps_valid = True
        for i, comp in enumerate(comparables, 1):
            if not validate_comparable(comp, i):
                all_comps_valid = False
        
        if all_comps_valid:
            print_success("All 10 comparables have required fields")
        
        # Validate insights section
        if 'insights' not in analysis:
            print_error("Missing 'insights' section in analysis")
        else:
            insights = analysis['insights']
            insights_fields = ['investment_thesis', 'growth_potential', 'key_risks', 
                              'catalysts', 'valuation_commentary', 'industry_positioning', 
                              'comparable_analysis_summary']
            missing_insights = [f for f in insights_fields if f not in insights]
            if missing_insights:
                print_error(f"Missing insights fields: {missing_insights}")
            else:
                print_success("Insights section has all required fields")
                
                # Validate arrays
                if not isinstance(insights.get('key_risks'), list):
                    print_error("key_risks should be a list")
                if not isinstance(insights.get('catalysts'), list):
                    print_error("catalysts should be a list")
        
        # Validate overall_confidence
        if 'overall_confidence' not in analysis:
            print_error("Missing 'overall_confidence' in analysis")
        else:
            print_success(f"overall_confidence: {analysis['overall_confidence']}")
        
        print_success(f"Analysis completed in {elapsed:.2f}s")
        return True, data['id']
        
    except requests.Timeout:
        print_error(f"Request timed out after {TIMEOUT}s")
        return False, None
    except Exception as e:
        print_error(f"Exception occurred: {str(e)}")
        import traceback
        traceback.print_exc()
        return False, None

def test_3_analyze_cached():
    """Test 3: POST /api/analyze with same company - Should return cached result"""
    print_test_header("Test 3: POST /api/analyze - Cached Result (Stripe)")
    
    try:
        payload = {"company_name": "Stripe"}
        print_info(f"Payload: {json.dumps(payload)}")
        print_info("Calling API (should return cached result < 1s)...")
        
        start_time = time.time()
        response = requests.post(f"{BASE_URL}/analyze", json=payload, timeout=10)
        elapsed = time.time() - start_time
        
        print_info(f"Status Code: {response.status_code}")
        print_info(f"Response Time: {elapsed:.2f}s")
        
        if response.status_code != 200:
            print_error(f"Expected status 200, got {response.status_code}")
            return False
        
        data = response.json()
        
        if data.get('cached') != True:
            print_error(f"Expected cached=true, got {data.get('cached')}")
            return False
        
        print_success(f"Cached result returned in {elapsed:.2f}s")
        
        if elapsed > 2.0:
            print_error(f"Cached response took {elapsed:.2f}s, expected < 1s")
            return False
        
        print_success("Response time is acceptable for cached result")
        return True
        
    except Exception as e:
        print_error(f"Exception occurred: {str(e)}")
        return False

def test_4_analyze_missing_company_name():
    """Test 4: POST /api/analyze with no body or empty company_name → expect 400"""
    print_test_header("Test 4: POST /api/analyze - Missing company_name")
    
    all_passed = True
    
    # Test with empty body
    try:
        print_info("Testing with empty body...")
        response = requests.post(f"{BASE_URL}/analyze", json={}, timeout=10)
        print_info(f"Status Code: {response.status_code}")
        
        if response.status_code != 400:
            print_error(f"Expected status 400 for empty body, got {response.status_code}")
            all_passed = False
        else:
            print_success("Empty body correctly returns 400")
            
    except Exception as e:
        print_error(f"Exception with empty body: {str(e)}")
        all_passed = False
    
    # Test with empty company_name
    try:
        print_info("Testing with empty company_name...")
        response = requests.post(f"{BASE_URL}/analyze", json={"company_name": ""}, timeout=10)
        print_info(f"Status Code: {response.status_code}")
        
        if response.status_code != 400:
            print_error(f"Expected status 400 for empty company_name, got {response.status_code}")
            all_passed = False
        else:
            print_success("Empty company_name correctly returns 400")
            
    except Exception as e:
        print_error(f"Exception with empty company_name: {str(e)}")
        all_passed = False
    
    # Test with whitespace company_name
    try:
        print_info("Testing with whitespace company_name...")
        response = requests.post(f"{BASE_URL}/analyze", json={"company_name": "   "}, timeout=10)
        print_info(f"Status Code: {response.status_code}")
        
        if response.status_code != 400:
            print_error(f"Expected status 400 for whitespace company_name, got {response.status_code}")
            all_passed = False
        else:
            print_success("Whitespace company_name correctly returns 400")
            
    except Exception as e:
        print_error(f"Exception with whitespace company_name: {str(e)}")
        all_passed = False
    
    return all_passed

def test_5_companies_recent():
    """Test 5: GET /api/companies/recent → expect {items:[...]}"""
    print_test_header("Test 5: GET /api/companies/recent")
    
    try:
        response = requests.get(f"{BASE_URL}/companies/recent", timeout=10)
        print_info(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print_error(f"Expected status 200, got {response.status_code}")
            return False
        
        data = response.json()
        
        if 'items' not in data:
            print_error("Response missing 'items' field")
            return False
        
        items = data['items']
        if not isinstance(items, list):
            print_error(f"'items' should be a list, got {type(items)}")
            return False
        
        print_success(f"Found {len(items)} recent analyses")
        
        if len(items) == 0:
            print_error("Expected at least 1 item in recent analyses")
            return False
        
        # Validate first item structure
        first_item = items[0]
        expected_fields = ['company', 'financials', 'overall_confidence']
        missing = [f for f in expected_fields if f not in first_item]
        
        if missing:
            print_error(f"First item missing fields: {missing}")
            return False
        
        print_success("First item has required fields: company, financials, overall_confidence")
        
        # Check financials structure
        financials = first_item['financials']
        if 'revenue_usd_m' in financials:
            print_success(f"Sample revenue: {financials['revenue_usd_m']}")
        if 'enterprise_value_usd_m' in financials:
            print_success(f"Sample EV: {financials['enterprise_value_usd_m']}")
        
        return True
        
    except Exception as e:
        print_error(f"Exception occurred: {str(e)}")
        return False

def test_6_companies_by_id(company_id):
    """Test 6: GET /api/companies/{id} → expect full document"""
    print_test_header(f"Test 6: GET /api/companies/{company_id}")
    
    if not company_id:
        print_error("No company ID provided from previous test")
        return False
    
    try:
        response = requests.get(f"{BASE_URL}/companies/{company_id}", timeout=10)
        print_info(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print_error(f"Expected status 200, got {response.status_code}")
            return False
        
        data = response.json()
        
        # Should have full document structure
        required_fields = ['id', 'key', 'company_name', 'analysis', 'created_at']
        missing = [f for f in required_fields if f not in data]
        
        if missing:
            print_error(f"Response missing fields: {missing}")
            return False
        
        print_success("Full document returned with all required fields")
        print_info(f"Company: {data.get('company_name')}")
        print_info(f"ID matches: {data.get('id') == company_id}")
        
        return True
        
    except Exception as e:
        print_error(f"Exception occurred: {str(e)}")
        return False

def test_7_companies_by_id_not_found():
    """Test 7: GET /api/companies/nonexistent-id → expect 404"""
    print_test_header("Test 7: GET /api/companies/nonexistent-id")
    
    try:
        fake_id = "nonexistent-id-12345"
        response = requests.get(f"{BASE_URL}/companies/{fake_id}", timeout=10)
        print_info(f"Status Code: {response.status_code}")
        
        if response.status_code != 404:
            print_error(f"Expected status 404, got {response.status_code}")
            return False
        
        print_success("Nonexistent ID correctly returns 404")
        return True
        
    except Exception as e:
        print_error(f"Exception occurred: {str(e)}")
        return False

def test_8_discover_new():
    """Test 8: POST /api/discover - New discovery (uncached) with specific filters"""
    print_test_header("Test 8: POST /api/discover - New Discovery")
    
    try:
        payload = {
            "continent": "Europe",
            "country": "",
            "sector": "Financial Services",
            "industry": "FinTech",
            "revenue_min": 10,
            "revenue_max": 200
        }
        print_info(f"Payload: {json.dumps(payload, indent=2)}")
        print_info("Calling API with 120s timeout (may take 25-45s)...")
        
        start_time = time.time()
        response = requests.post(f"{BASE_URL}/discover", json=payload, timeout=TIMEOUT)
        elapsed = time.time() - start_time
        
        print_info(f"Status Code: {response.status_code}")
        print_info(f"Response Time: {elapsed:.2f}s")
        
        if response.status_code != 200:
            print_error(f"Expected status 200, got {response.status_code}")
            print_error(f"Response: {response.text}")
            return False
        
        data = response.json()
        
        # Check top-level fields
        required_top_fields = ['id', 'key', 'filters', 'result', 'created_at', 'cached']
        missing_top = [f for f in required_top_fields if f not in data]
        if missing_top:
            print_error(f"Missing top-level fields: {missing_top}")
            return False
        
        print_success(f"All top-level fields present")
        print_info(f"ID: {data['id']}")
        print_info(f"Cached: {data['cached']}")
        
        if data['cached'] != False:
            print_error(f"Expected cached=false for first call, got {data['cached']}")
        
        result = data['result']
        
        # Validate result structure
        if 'filters_echo' not in result:
            print_error("Missing 'filters_echo' in result")
            return False
        
        if 'companies' not in result:
            print_error("Missing 'companies' in result")
            return False
        
        companies = result['companies']
        if not isinstance(companies, list):
            print_error(f"Companies should be a list, got {type(companies)}")
            return False
        
        # MUST BE EXACTLY 20 companies
        if len(companies) != 20:
            print_error(f"Expected exactly 20 companies, got {len(companies)}")
            return False
        
        print_success(f"Companies array has exactly 20 items")
        
        # Validate each company has required fields
        required_company_fields = ['name', 'country', 'region', 'continent', 'sector', 
                                   'industry', 'sub_industry', 'employees', 'revenue_usd_m', 
                                   'ebitda_usd_m', 'enterprise_value_usd_m', 'ev_revenue', 
                                   'ev_ebitda', 'year_founded', 'headquarters', 'one_liner', 
                                   'confidence']
        
        all_valid = True
        revenue_min = payload['revenue_min']
        revenue_max = payload['revenue_max']
        
        for i, company in enumerate(companies, 1):
            missing = [f for f in required_company_fields if f not in company]
            if missing:
                print_error(f"Company #{i} ({company.get('name', 'unknown')}) missing fields: {missing}")
                all_valid = False
            
            # Validate revenue is within range
            rev = company.get('revenue_usd_m')
            if rev is not None:
                if rev < revenue_min or rev > revenue_max:
                    print_error(f"Company #{i} ({company.get('name')}) revenue {rev} outside range [{revenue_min}, {revenue_max}]")
                    all_valid = False
        
        if all_valid:
            print_success("All 20 companies have required fields and revenue within range")
        
        print_success(f"Discovery completed in {elapsed:.2f}s")
        return all_valid
        
    except requests.Timeout:
        print_error(f"Request timed out after {TIMEOUT}s")
        return False
    except Exception as e:
        print_error(f"Exception occurred: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_9_discover_cached():
    """Test 9: POST /api/discover - Same filters should return cached result"""
    print_test_header("Test 9: POST /api/discover - Cached Result")
    
    try:
        payload = {
            "continent": "Europe",
            "country": "",
            "sector": "Financial Services",
            "industry": "FinTech",
            "revenue_min": 10,
            "revenue_max": 200
        }
        print_info(f"Payload: {json.dumps(payload, indent=2)}")
        print_info("Calling API (should return cached result < 1s)...")
        
        start_time = time.time()
        response = requests.post(f"{BASE_URL}/discover", json=payload, timeout=10)
        elapsed = time.time() - start_time
        
        print_info(f"Status Code: {response.status_code}")
        print_info(f"Response Time: {elapsed:.2f}s")
        
        if response.status_code != 200:
            print_error(f"Expected status 200, got {response.status_code}")
            return False
        
        data = response.json()
        
        if data.get('cached') != True:
            print_error(f"Expected cached=true, got {data.get('cached')}")
            return False
        
        print_success(f"Cached result returned in {elapsed:.2f}s")
        
        if elapsed > 2.0:
            print_error(f"Cached response took {elapsed:.2f}s, expected < 1s")
            return False
        
        print_success("Response time is acceptable for cached result")
        return True
        
    except Exception as e:
        print_error(f"Exception occurred: {str(e)}")
        return False

def test_10_dashboard_stats():
    """Test 10: GET /api/dashboard/stats - Validate complete structure"""
    print_test_header("Test 10: GET /api/dashboard/stats")
    
    try:
        response = requests.get(f"{BASE_URL}/dashboard/stats", timeout=10)
        print_info(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print_error(f"Expected status 200, got {response.status_code}")
            return False
        
        data = response.json()
        
        # Check top-level fields
        required_top = ['totals', 'sectors', 'countries', 'continents', 'industries']
        missing_top = [f for f in required_top if f not in data]
        if missing_top:
            print_error(f"Missing top-level fields: {missing_top}")
            return False
        
        print_success("All top-level fields present")
        
        # Validate totals structure
        totals = data['totals']
        required_totals = ['companies', 'avg_revenue', 'avg_ev', 'avg_ebitda', 'total_ev']
        missing_totals = [f for f in required_totals if f not in totals]
        if missing_totals:
            print_error(f"Missing totals fields: {missing_totals}")
            return False
        
        print_success(f"Totals: {totals['companies']} companies, avg_revenue={totals['avg_revenue']:.2f}, avg_ev={totals['avg_ev']:.2f}")
        
        # Companies count should be >= 1 since prior analyses are cached
        if totals['companies'] < 1:
            print_error(f"Expected at least 1 company, got {totals['companies']}")
            return False
        
        print_success(f"Companies count >= 1: {totals['companies']}")
        
        # Validate sectors array
        sectors = data['sectors']
        if not isinstance(sectors, list):
            print_error(f"Sectors should be a list, got {type(sectors)}")
            return False
        
        if len(sectors) > 0:
            sector = sectors[0]
            required_sector_fields = ['sector', 'count', 'avg_rev', 'avg_ev', 'avg_ebitda', 
                                     'avg_ev_revenue', 'avg_ev_ebitda']
            missing_sector = [f for f in required_sector_fields if f not in sector]
            if missing_sector:
                print_error(f"Sector missing fields: {missing_sector}")
                return False
            print_success(f"Sectors array valid with {len(sectors)} items")
        
        # Validate countries array
        countries = data['countries']
        if not isinstance(countries, list):
            print_error(f"Countries should be a list, got {type(countries)}")
            return False
        
        if len(countries) > 0:
            country = countries[0]
            required_country_fields = ['country', 'count', 'avg_rev', 'avg_ev']
            missing_country = [f for f in required_country_fields if f not in country]
            if missing_country:
                print_error(f"Country missing fields: {missing_country}")
                return False
            print_success(f"Countries array valid with {len(countries)} items")
        
        # Validate continents array
        continents = data['continents']
        if not isinstance(continents, list):
            print_error(f"Continents should be a list, got {type(continents)}")
            return False
        print_success(f"Continents array valid with {len(continents)} items")
        
        # Validate industries array
        industries = data['industries']
        if not isinstance(industries, list):
            print_error(f"Industries should be a list, got {type(industries)}")
            return False
        print_success(f"Industries array valid with {len(industries)} items")
        
        return True
        
    except Exception as e:
        print_error(f"Exception occurred: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_11_auth_signup():
    """Test 11: POST /api/auth/signup - New user registration"""
    print_test_header("Test 11: POST /api/auth/signup - New User")
    
    try:
        # Use timestamp to ensure unique email
        timestamp = int(time.time())
        payload = {
            "email": f"test_{timestamp}@square.com",
            "password": "pass1234",
            "name": "Test User"
        }
        print_info(f"Payload: {json.dumps(payload, indent=2)}")
        
        session = requests.Session()
        response = session.post(f"{BASE_URL}/auth/signup", json=payload, timeout=10)
        
        print_info(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print_error(f"Expected status 200, got {response.status_code}")
            print_error(f"Response: {response.text}")
            return False, None, None
        
        data = response.json()
        
        # Check response structure
        if 'user' not in data or 'token' not in data:
            print_error(f"Missing 'user' or 'token' in response")
            return False, None, None
        
        user = data['user']
        required_user_fields = ['id', 'email', 'name', 'role']
        missing = [f for f in required_user_fields if f not in user]
        if missing:
            print_error(f"User missing fields: {missing}")
            return False, None, None
        
        if user['role'] != 'analyst':
            print_error(f"Expected role 'analyst', got {user['role']}")
            return False, None, None
        
        print_success(f"User created: {user['email']} with role {user['role']}")
        
        # Check for Set-Cookie header
        cookies = response.headers.get('Set-Cookie', '')
        if 'sa_token=' not in cookies:
            print_error("Set-Cookie header missing sa_token")
            return False, None, None
        
        print_success("Set-Cookie header contains sa_token")
        
        return True, payload['email'], payload['password']
        
    except Exception as e:
        print_error(f"Exception occurred: {str(e)}")
        import traceback
        traceback.print_exc()
        return False, None, None

def test_12_auth_signup_duplicate(email):
    """Test 12: POST /api/auth/signup - Duplicate email should return 409"""
    print_test_header("Test 12: POST /api/auth/signup - Duplicate Email")
    
    if not email:
        print_error("No email provided from previous test")
        return False
    
    try:
        payload = {
            "email": email,
            "password": "pass1234",
            "name": "Test User"
        }
        print_info(f"Attempting to register duplicate email: {email}")
        
        response = requests.post(f"{BASE_URL}/auth/signup", json=payload, timeout=10)
        
        print_info(f"Status Code: {response.status_code}")
        
        if response.status_code != 409:
            print_error(f"Expected status 409 for duplicate email, got {response.status_code}")
            return False
        
        print_success("Duplicate email correctly returns 409 conflict")
        return True
        
    except Exception as e:
        print_error(f"Exception occurred: {str(e)}")
        return False

def test_13_auth_login_wrong_password(email):
    """Test 13: POST /api/auth/login - Wrong password should return 401"""
    print_test_header("Test 13: POST /api/auth/login - Wrong Password")
    
    if not email:
        print_error("No email provided from previous test")
        return False
    
    try:
        payload = {
            "email": email,
            "password": "wrongpassword"
        }
        print_info(f"Attempting login with wrong password for: {email}")
        
        response = requests.post(f"{BASE_URL}/auth/login", json=payload, timeout=10)
        
        print_info(f"Status Code: {response.status_code}")
        
        if response.status_code != 401:
            print_error(f"Expected status 401 for wrong password, got {response.status_code}")
            return False
        
        print_success("Wrong password correctly returns 401 unauthorized")
        return True
        
    except Exception as e:
        print_error(f"Exception occurred: {str(e)}")
        return False

def test_14_auth_login_success(email, password):
    """Test 14: POST /api/auth/login - Correct credentials should return 200 + cookie"""
    print_test_header("Test 14: POST /api/auth/login - Success")
    
    if not email or not password:
        print_error("No email/password provided from previous test")
        return False, None
    
    try:
        payload = {
            "email": email,
            "password": password
        }
        print_info(f"Attempting login with correct credentials for: {email}")
        
        session = requests.Session()
        response = session.post(f"{BASE_URL}/auth/login", json=payload, timeout=10)
        
        print_info(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print_error(f"Expected status 200, got {response.status_code}")
            print_error(f"Response: {response.text}")
            return False, None
        
        data = response.json()
        
        # Check response structure
        if 'user' not in data or 'token' not in data:
            print_error(f"Missing 'user' or 'token' in response")
            return False, None
        
        print_success(f"Login successful for {data['user']['email']}")
        
        # Check for Set-Cookie header
        cookies = response.headers.get('Set-Cookie', '')
        if 'sa_token=' not in cookies:
            print_error("Set-Cookie header missing sa_token")
            return False, None
        
        print_success("Set-Cookie header contains sa_token")
        
        return True, session
        
    except Exception as e:
        print_error(f"Exception occurred: {str(e)}")
        import traceback
        traceback.print_exc()
        return False, None

def test_15_auth_me_with_cookie(session):
    """Test 15: GET /api/auth/me - With cookie should return user"""
    print_test_header("Test 15: GET /api/auth/me - With Cookie")
    
    if not session:
        print_error("No session provided from previous test")
        return False
    
    try:
        response = session.get(f"{BASE_URL}/auth/me", timeout=10)
        
        print_info(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print_error(f"Expected status 200, got {response.status_code}")
            return False
        
        data = response.json()
        
        if 'user' not in data:
            print_error("Missing 'user' in response")
            return False
        
        user = data['user']
        if user is None:
            print_error("Expected user object, got null")
            return False
        
        required_fields = ['id', 'email', 'name', 'role']
        missing = [f for f in required_fields if f not in user]
        if missing:
            print_error(f"User missing fields: {missing}")
            return False
        
        print_success(f"User retrieved: {user['email']}")
        return True
        
    except Exception as e:
        print_error(f"Exception occurred: {str(e)}")
        return False

def test_16_auth_me_without_cookie():
    """Test 16: GET /api/auth/me - Without cookie should return {user:null}"""
    print_test_header("Test 16: GET /api/auth/me - Without Cookie")
    
    try:
        # Use a fresh session without cookies
        response = requests.get(f"{BASE_URL}/auth/me", timeout=10)
        
        print_info(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print_error(f"Expected status 200, got {response.status_code}")
            return False
        
        data = response.json()
        
        if 'user' not in data:
            print_error("Missing 'user' in response")
            return False
        
        if data['user'] is not None:
            print_error(f"Expected user=null without cookie, got {data['user']}")
            return False
        
        print_success("Without cookie correctly returns {user:null}")
        return True
        
    except Exception as e:
        print_error(f"Exception occurred: {str(e)}")
        return False

def test_17_auth_logout(session):
    """Test 17: POST /api/auth/logout - Should clear cookie"""
    print_test_header("Test 17: POST /api/auth/logout")
    
    if not session:
        print_error("No session provided from previous test")
        return False
    
    try:
        response = session.post(f"{BASE_URL}/auth/logout", timeout=10)
        
        print_info(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print_error(f"Expected status 200, got {response.status_code}")
            return False
        
        # Check for Set-Cookie header that clears the token
        cookies = response.headers.get('Set-Cookie', '')
        if 'sa_token=' not in cookies or 'Max-Age=0' not in cookies:
            print_error("Set-Cookie header should clear sa_token with Max-Age=0")
            return False
        
        print_success("Logout successful, cookie cleared")
        return True
        
    except Exception as e:
        print_error(f"Exception occurred: {str(e)}")
        return False

def test_18_auth_signup_missing_fields():
    """Test 18: POST /api/auth/signup - Missing email/password should return 400"""
    print_test_header("Test 18: POST /api/auth/signup - Missing Fields")
    
    all_passed = True
    
    # Test with missing email
    try:
        print_info("Testing with missing email...")
        payload = {"password": "pass1234", "name": "Test"}
        response = requests.post(f"{BASE_URL}/auth/signup", json=payload, timeout=10)
        print_info(f"Status Code: {response.status_code}")
        
        if response.status_code != 400:
            print_error(f"Expected status 400 for missing email, got {response.status_code}")
            all_passed = False
        else:
            print_success("Missing email correctly returns 400")
            
    except Exception as e:
        print_error(f"Exception with missing email: {str(e)}")
        all_passed = False
    
    # Test with missing password
    try:
        print_info("Testing with missing password...")
        payload = {"email": "test@square.com", "name": "Test"}
        response = requests.post(f"{BASE_URL}/auth/signup", json=payload, timeout=10)
        print_info(f"Status Code: {response.status_code}")
        
        if response.status_code != 400:
            print_error(f"Expected status 400 for missing password, got {response.status_code}")
            all_passed = False
        else:
            print_success("Missing password correctly returns 400")
            
    except Exception as e:
        print_error(f"Exception with missing password: {str(e)}")
        all_passed = False
    
    return all_passed

def main():
    print("\n" + "="*80)
    print("SQUARE ASSOCIATES BACKEND API TEST SUITE V2")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print(f"Timeout: {TIMEOUT}s")
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    results = {}
    company_id = None
    test_email = None
    test_password = None
    auth_session = None
    
    # ===== EXISTING ENDPOINTS (verify still working) =====
    print("\n" + "="*80)
    print("PART 1: EXISTING ENDPOINTS")
    print("="*80)
    
    # Test 1: Root endpoint
    results['test_1_root'] = test_1_root_endpoint()
    
    # Test 2: Analyze new company (uncached)
    success, company_id = test_2_analyze_new_company()
    results['test_2_analyze_new'] = success
    
    # Test 3: Analyze same company (cached)
    results['test_3_analyze_cached'] = test_3_analyze_cached()
    
    # Test 4: Missing company_name validation
    results['test_4_missing_company'] = test_4_analyze_missing_company_name()
    
    # Test 5: Recent companies
    results['test_5_recent'] = test_5_companies_recent()
    
    # Test 6: Get company by ID
    results['test_6_by_id'] = test_6_companies_by_id(company_id)
    
    # Test 7: Get nonexistent company
    results['test_7_not_found'] = test_7_companies_by_id_not_found()
    
    # ===== NEW V2 ENDPOINTS =====
    print("\n" + "="*80)
    print("PART 2: NEW V2 ENDPOINTS - DISCOVERY")
    print("="*80)
    
    # Test 8: Discovery new (uncached)
    results['test_8_discover_new'] = test_8_discover_new()
    
    # Test 9: Discovery cached
    results['test_9_discover_cached'] = test_9_discover_cached()
    
    # Test 10: Dashboard stats
    results['test_10_dashboard_stats'] = test_10_dashboard_stats()
    
    # ===== AUTH FLOW =====
    print("\n" + "="*80)
    print("PART 3: NEW V2 ENDPOINTS - AUTHENTICATION")
    print("="*80)
    
    # Test 11: Signup new user
    success, test_email, test_password = test_11_auth_signup()
    results['test_11_auth_signup'] = success
    
    # Test 12: Duplicate signup
    results['test_12_auth_duplicate'] = test_12_auth_signup_duplicate(test_email)
    
    # Test 13: Login with wrong password
    results['test_13_auth_wrong_password'] = test_13_auth_login_wrong_password(test_email)
    
    # Test 14: Login success
    success, auth_session = test_14_auth_login_success(test_email, test_password)
    results['test_14_auth_login'] = success
    
    # Test 15: /me with cookie
    results['test_15_auth_me_with_cookie'] = test_15_auth_me_with_cookie(auth_session)
    
    # Test 16: /me without cookie
    results['test_16_auth_me_without_cookie'] = test_16_auth_me_without_cookie()
    
    # Test 17: Logout
    results['test_17_auth_logout'] = test_17_auth_logout(auth_session)
    
    # Test 18: Signup validation
    results['test_18_auth_validation'] = test_18_auth_signup_missing_fields()
    
    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{status}: {test_name}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    print(f"Completed: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED!")
        return 0
    else:
        print(f"\n⚠️  {total - passed} TEST(S) FAILED")
        return 1

if __name__ == "__main__":
    exit(main())
