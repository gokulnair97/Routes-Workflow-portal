import requests
import sys
import json
from datetime import datetime

class APITester:
    def __init__(self, base_url="https://medical-pipeline.preview.emergentagent.com"):
        self.base_url = base_url
        self.admin_token = None
        self.staff_token = None
        self.test_staff_id = None
        self.test_candidate_id = None
        self.test_payment_id = None
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None, token=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = f'Bearer {token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json() if response.text else {}
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    print(f"   Error: {response.json()}")
                except:
                    print(f"   Raw response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_admin_login(self):
        """Test admin login"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"username": "admin", "password": "admin"}
        )
        if success and 'token' in response:
            self.admin_token = response['token']
            print(f"   Admin token acquired: {self.admin_token[:20]}...")
            return True
        return False

    def test_admin_dashboard_stats(self):
        """Test admin dashboard stats"""
        success, response = self.run_test(
            "Admin Dashboard Stats",
            "GET",
            "admin/dashboard-stats",
            200,
            token=self.admin_token
        )
        if success:
            print(f"   Total candidates: {response.get('total_candidates', 0)}")
            print(f"   Staff count: {response.get('staff_count', 0)}")
            return True
        return False

    def test_create_staff(self):
        """Test staff creation"""
        staff_data = {
            "username": f"teststaff_{datetime.now().strftime('%H%M%S')}",
            "password": "testpass123",
            "full_name": "Test Staff Member"
        }
        success, response = self.run_test(
            "Create Staff",
            "POST",
            "admin/staff",
            200,
            data=staff_data,
            token=self.admin_token
        )
        if success and 'id' in response:
            self.test_staff_id = response['id']
            self.test_staff_username = staff_data['username']
            self.test_staff_password = staff_data['password']
            print(f"   Staff created with ID: {self.test_staff_id}")
            return True
        return False

    def test_staff_login(self):
        """Test staff login"""
        success, response = self.run_test(
            "Staff Login",
            "POST",
            "auth/login",
            200,
            data={"username": self.test_staff_username, "password": self.test_staff_password}
        )
        if success and 'token' in response:
            self.staff_token = response['token']
            print(f"   Staff token acquired: {self.staff_token[:20]}...")
            return True
        return False

    def test_create_candidate(self):
        """Test candidate creation"""
        candidate_data = {
            "name": f"Test Candidate {datetime.now().strftime('%H%M%S')}",
            "passport_number": f"P{datetime.now().strftime('%H%M%S')}",
            "application_id": f"APP-TEST{datetime.now().strftime('%H%M%S')}"
        }
        success, response = self.run_test(
            "Create Candidate",
            "POST",
            "candidates",
            200,
            data=candidate_data,
            token=self.staff_token
        )
        if success and 'id' in response:
            self.test_candidate_id = response['id']
            self.test_candidate_name = response['name']
            print(f"   Candidate created with ID: {self.test_candidate_id}")
            return True
        return False

    def test_incoming_register(self):
        """Test incoming register creation"""
        incoming_data = {
            "candidate_id": self.test_candidate_id,
            "candidate_name": self.test_candidate_name,
            "documents": ["Passport Copy", "Degree Certificate", "Nursing License"],
            "date": "2024-01-15",
            "staff_name": "Test Staff Member"
        }
        success, response = self.run_test(
            "Create Incoming Register",
            "POST",
            "incoming",
            200,
            data=incoming_data,
            token=self.staff_token
        )
        return success

    def test_outgoing_register(self):
        """Test outgoing register creation"""
        outgoing_data = {
            "candidate_id": self.test_candidate_id,
            "candidate_name": self.test_candidate_name,
            "destination": "Saudi Arabia",
            "date": "2024-01-20",
            "remarks": "Test outgoing"
        }
        success, response = self.run_test(
            "Create Outgoing Register",
            "POST",
            "outgoing",
            200,
            data=outgoing_data,
            token=self.staff_token
        )
        return success

    def test_return_register(self):
        """Test return register creation"""
        return_data = {
            "candidate_id": self.test_candidate_id,
            "candidate_name": self.test_candidate_name,
            "return_date": "2024-02-01",
            "remarks": "Test return"
        }
        success, response = self.run_test(
            "Create Return Register",
            "POST",
            "return",
            200,
            data=return_data,
            token=self.staff_token
        )
        return success

    def test_add_payment(self):
        """Test payment addition"""
        payment_data = {
            "candidate_id": self.test_candidate_id,
            "candidate_name": self.test_candidate_name,
            "transaction_id": f"TXN{datetime.now().strftime('%H%M%S')}",
            "date": "2024-01-25",
            "account_holder": "Test Account Holder",
            "amount": 1500.00,
            "notes": "Test payment"
        }
        success, response = self.run_test(
            "Add Payment",
            "POST",
            "payments",
            200,
            data=payment_data,
            token=self.admin_token
        )
        if success and 'id' in response:
            self.test_payment_id = response['id']
            print(f"   Payment created with ID: {self.test_payment_id}")
            return True
        return False

    def test_approve_payment(self):
        """Test payment approval"""
        success, response = self.run_test(
            "Approve Payment",
            "PUT",
            f"payments/{self.test_payment_id}/approve",
            200,
            token=self.admin_token
        )
        return success

    def test_exit_register_success(self):
        """Test exit register creation (should succeed after payment approval)"""
        exit_data = {
            "candidate_id": self.test_candidate_id,
            "candidate_name": self.test_candidate_name,
            "documents": ["Passport Copy", "Degree Certificate"],
            "exit_date": "2024-02-15"
        }
        success, response = self.run_test(
            "Create Exit Register (After Payment Approval)",
            "POST",
            "exit",
            200,
            data=exit_data,
            token=self.staff_token
        )
        return success

    def test_exit_register_blocked(self):
        """Test exit register creation without payment approval (should fail)"""
        # Create another candidate without payment approval
        candidate_data = {
            "name": f"Test No Payment {datetime.now().strftime('%H%M%S')}",
            "passport_number": f"NP{datetime.now().strftime('%H%M%S')}",
        }
        success, response = self.run_test(
            "Create Test Candidate (No Payment)",
            "POST",
            "candidates",
            200,
            data=candidate_data,
            token=self.staff_token
        )
        if not success:
            return False
        
        no_pay_candidate_id = response['id']
        exit_data = {
            "candidate_id": no_pay_candidate_id,
            "candidate_name": response['name'],
            "documents": ["Passport Copy"],
            "exit_date": "2024-02-15"
        }
        # This should fail with 400 status
        success, response = self.run_test(
            "Create Exit Register (No Payment - Should Fail)",
            "POST",
            "exit",
            400,
            data=exit_data,
            token=self.staff_token
        )
        return success  # Success means it properly blocked the exit

    def test_public_candidate_tracker(self):
        """Test public candidate tracking"""
        success, response = self.run_test(
            "Public Candidate Tracker",
            "GET",
            f"public/track?q={self.test_candidate_name}",
            200
        )
        if success:
            print(f"   Found candidate: {response.get('name', 'N/A')}")
            print(f"   Current stage: {response.get('current_stage', 'N/A')}")
            return True
        return False

    def test_audit_logs(self):
        """Test audit logs retrieval"""
        success, response = self.run_test(
            "Audit Logs",
            "GET",
            "admin/audit-logs",
            200,
            token=self.admin_token
        )
        if success:
            print(f"   Total logs: {len(response)}")
            return True
        return False

    def test_stage_management(self):
        """Test stage locking functionality"""
        lock_data = {"stage": "Outgoing Attestation", "lock": True}
        success, response = self.run_test(
            "Lock Stage",
            "PUT",
            f"candidates/{self.test_candidate_id}/lock-stage",
            200,
            data=lock_data,
            token=self.staff_token
        )
        return success

    def test_notifications_endpoint(self):
        """Test notifications endpoint for Smart Alerts"""
        success, response = self.run_test(
            "Get Notifications",
            "GET",
            "notifications",
            200,
            token=self.admin_token
        )
        if success:
            print(f"   Counts: {response.get('counts', {})}")
            print(f"   Alerts: {len(response.get('alerts', []))} alerts")
            # Verify structure
            counts = response.get('counts', {})
            expected_keys = ['overdue', 'due_soon', 'on_track', 'pending_files', 'waiting_actions', 'total']
            for key in expected_keys:
                if key not in counts:
                    print(f"   ❌ Missing count key: {key}")
                    return False
            return True
        return False

    def test_quick_action_endpoint(self):
        """Test quick action endpoint for admin"""
        # Test with due date setting
        from datetime import datetime, timedelta
        future_date = (datetime.now() + timedelta(days=5)).strftime('%Y-%m-%d')
        
        quick_action_data = {
            "stage": "Dataflow Processing",
            "action": "in_progress",
            "due_date": future_date,
            "remarks": "Test quick action",
            "lock": False
        }
        success, response = self.run_test(
            "Quick Action - Set In Progress",
            "PUT",
            f"candidates/{self.test_candidate_id}/quick-action",
            200,
            data=quick_action_data,
            token=self.admin_token
        )
        if not success:
            return False

        # Test completion action
        complete_action = {
            "stage": "Dataflow Processing", 
            "action": "completed",
            "lock": True
        }
        success, response = self.run_test(
            "Quick Action - Mark Complete",
            "PUT",
            f"candidates/{self.test_candidate_id}/quick-action",
            200,
            data=complete_action,
            token=self.admin_token
        )
        return success

    def test_due_date_endpoint(self):
        """Test due date setting endpoint"""
        from datetime import datetime, timedelta
        overdue_date = (datetime.now() - timedelta(days=2)).strftime('%Y-%m-%d')
        
        due_date_data = {
            "stage": "Prometric Preparation",
            "due_date": overdue_date
        }
        success, response = self.run_test(
            "Set Due Date",
            "PUT",
            f"candidates/{self.test_candidate_id}/due-date",
            200,
            data=due_date_data,
            token=self.staff_token
        )
        return success

    def test_notifications_with_overdue(self):
        """Test notifications after setting overdue dates"""
        success, response = self.run_test(
            "Get Notifications (With Overdue)",
            "GET",
            "notifications",
            200,
            token=self.admin_token
        )
        if success:
            counts = response.get('counts', {})
            alerts = response.get('alerts', [])
            print(f"   Overdue count: {counts.get('overdue', 0)}")
            print(f"   Due soon count: {counts.get('due_soon', 0)}")
            print(f"   Total alerts: {len(alerts)}")
            
            # Check for overdue alerts
            overdue_alerts = [a for a in alerts if a.get('type') == 'overdue']
            print(f"   Overdue alerts: {len(overdue_alerts)}")
            return True
        return False

    def cleanup(self):
        """Clean up test data"""
        if self.test_staff_id and self.admin_token:
            self.run_test(
                "Cleanup Staff",
                "DELETE",
                f"admin/staff/{self.test_staff_id}",
                200,
                token=self.admin_token
            )

def main():
    print("🚀 Starting Routes International API Testing...")
    tester = APITester()
    
    # Test sequence
    tests = [
        tester.test_admin_login,
        tester.test_admin_dashboard_stats,
        tester.test_create_staff,
        tester.test_staff_login,
        tester.test_create_candidate,
        tester.test_incoming_register,
        tester.test_outgoing_register,
        tester.test_return_register,
        tester.test_add_payment,
        tester.test_exit_register_blocked,  # Test before payment approval
        tester.test_approve_payment,
        tester.test_exit_register_success,  # Test after payment approval
        tester.test_public_candidate_tracker,
        tester.test_audit_logs,
        tester.test_stage_management,
        # NEW NOTIFICATION & QUICK ACTION TESTS
        tester.test_notifications_endpoint,
        tester.test_quick_action_endpoint,
        tester.test_due_date_endpoint,
        tester.test_notifications_with_overdue,
    ]
    
    for test in tests:
        if not test():
            print(f"\n❌ Test failed: {test.__name__}")
            break
    
    # Cleanup
    tester.cleanup()
    
    # Print results
    print(f"\n📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    success_rate = (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0
    print(f"📈 Success Rate: {success_rate:.1f}%")
    
    return 0 if success_rate >= 90 else 1

if __name__ == "__main__":
    sys.exit(main())