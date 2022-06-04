<?php
namespace RSG;

class helper {

	static function get_total_amount($select){
		$count = 0;
		global $host,$userdb,$pass,$dbname;
		$db = new \RSG\MySQL($host,$userdb,$pass,$dbname);
		$sql = $select;
		$results = $db->query($sql);
		if($results->size() >= 1){
			$count = $results->size();
		}else{
			//Do Nothing
		}
		return $count;
	}

	static function convert_to_datetime($myDate,$myTime){
		//FORMAT DATE
		$new_date = date('Y-m-d',strtotime($myDate));

		//FORMAT TIME
		$time_array = explode(' ',$myTime);
		$time = $time_array[0].':00';
		$meridian = $time_array[1];
		$hour_pm = '';
		$hour_am = '';
		$hour = explode(':',$time);
		if($meridian == 'PM'){
			if($hour[0] < 12){
				$hour_pm = $hour[0] + 12;
			}else{
				$hour_pm = 12;
			}
			$new_time = $hour_pm.':'.$hour[1].':00';
			$time = $new_time;
		}elseif($meridian == 'AM'){
			if($hour[0] == 12){
				$hour[0] = '00';
				$hour_am = $hour[0];
				$new_time = $hour_am.':'.$hour[1].':00';
				$time = $new_time;
			}
		}

		//STRING TOGETHER
		$new_date_time = $new_date.' '.$time;

		//RETURN NEW DATE TIME
		return $new_date_time;
	}

	static function get_date_modified($my_date){
		if($my_date == NULL){
			$reformat_date_modified = '';
		}else{
			$date_modified = $my_date;
			$reformat_date_modified = date('m/d/Y', strtotime($date_modified));
		}
		return $reformat_date_modified;
	}

	static function get_time_modified($my_date){
		if($my_date == NULL){
			$reformat_time_modified = '';
		}else{
			$time_modified = $my_date;
			$reformat_time_modified = date('h:i a', strtotime($time_modified));
		}
		return $reformat_time_modified;
	}

	static function get_user_name($user_id){
		global $host,$userdb,$pass,$dbname;
		$db = new \RSG\MySQL($host,$userdb,$pass,$dbname);
		$sql = "SELECT * FROM users WHERE user_id = ".$user_id;
		$results = $db->query($sql);
		while($row = $results->fetch()){
			$user_name = $row['first_name'].' '.$row['last_name'];
		}
		return $user_name;
	}

	static function get_profile_image($user_id){
		global $host,$userdb,$pass,$dbname;
		$db = new \RSG\MySQL($host,$userdb,$pass,$dbname);
		$sql = "SELECT * FROM user WHERE user_id = ".$user_id;
		$results = $db->query($sql);
		while($row = $results->fetch()){
			$profile_image = $row['image'];
		}
		return $profile_image;
	}


	//PLEASE SET UP SESSION VARIABLES
	static function login($email,$password){
		global $host,$userdb,$pass,$dbname;
		$email = mysqli_real_escape_string($db->dbConn,$email);
		$sql = "SELECT * FROM customers WHERE email='".$email."'";
		$db = new \RSG\MySQL($host,$userdb,$pass,$dbname);
		$result = $db->query($sql);
		$dbChecked=false;
		while ($row = $result->fetch()) {
			$mypassword = $row['password'];
			if($password == $mypassword){
				$dbChecked=true;
				if($row['active']=='Y'){
					$_SESSION['login'] = true;
					//---------CUSTOM START
					$_SESSION['email'] = $email;
					$_SESSION['customer_id'] = $row['customer_id'];
					$_SESSION['first_name'] = $row['first_name'];
					$_SESSION['last_name'] = $row['last_name'];
					$_SESSION['fullname'] = $row['first_name']. " " .$row['last_name'] ;
					$mycart = getCart($_SESSION['customer_id']);
					$_SESSION['cart_id'] = $mycart;
					$_SESSION['company'] = $row['company'];
					$_SESSION['address'] = $row['address'];
					$_SESSION['city'] = $row['city'];
					$_SESSION['province'] = $row['province'];
					$_SESSION['postal_code'] = $row['postal_code'];
					$_SESSION['phone'] = $row['phone'];
					header("location:edit-account.php");
					//---------CUSTOM END
					exit;
				}else{
					$_SESSION['login'] = false;
					//---------CUSTOM START
					$_SESSION['email'] = "";
					$_SESSION['customer_id'] = "";
					$_SESSION['first_name'] = "";
					$_SESSION['last_name'] ="";
					$_SESSION['fullname'] ="";
					$_SESSION['cart_id'] = "";
					$_SESSION['error'] = "Your account has not been activated.";
					$_SESSION['company'] = "";
					$_SESSION['address'] = "";
					$_SESSION['city'] = "";
					$_SESSION['province'] = "";
					$_SESSION['postal_code'] = "";
					$_SESSION['phone'] = "";
					//---------CUSTOM END
				}
			}else{
				$_SESSION['login'] = false;
				//---------CUSTOM START
				$_SESSION['email'] = "";
				$_SESSION['customer_id'] = "";
				$_SESSION['first_name'] = "";
				$_SESSION['last_name'] ="";
				$_SESSION['fullname'] ="";
				$_SESSION['cart_id'] = "";
				$_SESSION['error'] = "Username/Password does not match.";
				$_SESSION['company'] = "";
				$_SESSION['address'] = "";
				$_SESSION['city'] = "";
				$_SESSION['province'] = "";
				$_SESSION['postal_code'] = "";
				$_SESSION['phone'] = "";
				//---------CUSTOM END
			}
		}
		if(!$dbChecked) {
			$_SESSION['login'] = false;
			//---------CUSTOM START
			$_SESSION['email'] = "";
			$_SESSION['customer_id'] = "";
			$_SESSION['first_name'] = "";
			$_SESSION['last_name'] ="";
			$_SESSION['fullname'] ="";
			$_SESSION['cart_id'] = "";
			$_SESSION['error'] = "Username/Password does not match.";
			$_SESSION['company'] = "";
			$_SESSION['address'] = "";
			$_SESSION['city'] = "";
			$_SESSION['province'] = "";
			$_SESSION['postal_code'] = "";
			$_SESSION['phone'] = "";
			//---------CUSTOM END
		}
	}
}

?>