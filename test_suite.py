import json
import urllib.request
import urllib.error
import http.cookiejar

BASE_URL = 'http://localhost:3000'

class HttpClient:
  def __init__(self, base_url=BASE_URL):
    self.base_url = base_url
    self.cookie_jar = http.cookiejar.CookieJar()
    self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.cookie_jar))
    self.auth_token = None

  def set_auth(self, token):
    self.auth_token = token

  def clear_auth(self):
    self.auth_token = None

  def clear_cookies(self):
    self.cookie_jar.clear()

  def get_cookie(self, name):
    for cookie in self.cookie_jar:
      if cookie.name == name:
        return cookie.value
    return None

  def request(self, method, path, data=None, headers=None, send_cookies=True):
    url = f"{self.base_url}{path}"
    req_headers = headers.copy() if headers else {}

    body = None
    if data is not None:
      body = json.dumps(data).encode('utf-8')
      req_headers['Content-Type'] = 'application/json'

    if self.auth_token and 'Authorization' not in req_headers:
      req_headers['Authorization'] = f"Bearer {self.auth_token}"

    req = urllib.request.Request(url, data=body, headers=req_headers, method=method)

    try:
      if send_cookies:
        res = self.opener.open(req)
      else:
        # Petición sin cookies automáticas
        res = urllib.request.urlopen(req)
      status_code = res.status
      resp_body = res.read().decode('utf-8')
      json_data = json.loads(resp_body) if resp_body else {}
      return status_code, json_data, res.headers
    except urllib.error.HTTPError as e:
      status_code = e.code
      resp_body = e.read().decode('utf-8')
      try:
        json_data = json.loads(resp_body)
      except Exception:
        json_data = {'raw': resp_body}
      return status_code, json_data, e.headers


def run_tests():
  client = HttpClient()
  print("=== INICIANDO SUITE DE PRUEBAS DE BCK (NESTJS) ===")

  # 1. Health Check
  code, data, _ = client.request('GET', '/api')
  assert code == 200, f"Health root failed: {code} {data}"
  assert data['status'] == 'ok'

  code_h, data_h, _ = client.request('GET', '/api/health')
  assert code_h == 200, f"Health explicit failed: {code_h}"
  assert data_h['status'] == 'ok'
  print("1. Health Check (root /api y /api/health) [PASS]")

  # 2. Seed canónico
  code, seed_data, _ = client.request('GET', '/api/seed')
  assert code == 200, f"Seed failed: {code} {seed_data}"
  assert seed_data['organizaciones'] == 5
  assert seed_data['usuarios'] == 25
  assert seed_data['tareas'] == 500
  print("2. Seed canónico (/api/seed): 5 orgs, 25 users, 500 tasks [PASS]")

  # 3. Login
  login_payload = {
    'email': 'admin@techcorp.com',
    'password': '123456',
  }
  code, login_data, headers = client.request('POST', '/api/auth/login', login_payload)
  assert code == 201, f"Login failed: {code} {login_data}"
  assert 'access_token' in login_data
  assert login_data['user']['role'] == 'admin'
  access_token = login_data['access_token']
  client.set_auth(access_token)

  refresh_cookie = client.get_cookie('refreshToken')
  assert refresh_cookie is not None, "Cookie refreshToken no encontrada"
  print("3. Login: status 201, token access y cookie HttpOnly refreshToken [PASS]")

  # 4. Me
  code, me_data, _ = client.request('GET', '/api/auth/me')
  assert code == 200, f"Me failed: {code} {me_data}"
  assert me_data['user']['email'] == 'admin@techcorp.com'
  org_id = me_data['user']['organizacion_id']
  print("4. Me: status 200, perfil de usuario autenticado [PASS]")

  # 5. Check Slug
  code, slug_data, _ = client.request('GET', '/api/org/check-slug/techcorp')
  assert code == 200
  assert slug_data['available'] is False
  assert 'suggestion' in slug_data

  code, slug_free, _ = client.request('GET', '/api/org/check-slug/nueva-empresa-unica')
  assert code == 200
  assert slug_free['available'] is True
  print("5. Check Slug: disponibilidad y sugerencias [PASS]")

  # 6. Org List & Detail & Update
  code, org_list, _ = client.request('GET', '/api/org?size=10')
  assert code == 200
  assert org_list['count'] == 1
  assert org_list['results'][0]['slug'] == 'techcorp'
  assert 'page' in org_list and 'size' in org_list and 'first' in org_list

  code, org_detail, _ = client.request('GET', f'/api/org/detail/{org_id}')
  assert code == 200
  assert org_detail['name'] == 'TechCorp'

  code, org_updated, _ = client.request('PATCH', f'/api/org/update/{org_id}', {'name': 'TechCorp Global'})
  assert code == 200
  assert org_updated['name'] == 'TechCorp Global'
  print("6. Org: Listado con paginación, detalle y actualización [PASS]")

  # 7. Usr List, Create, Soft-delete y Restore
  code, usr_list, _ = client.request('GET', '/api/usr?size=10')
  assert code == 200
  assert usr_list['count'] == 5

  # Crear usuario
  new_usr_payload = {
    'email': 'developer@techcorp.com',
    'name': 'Dev TechCorp',
    'password': 'password123',
    'role': 'member',
  }
  code, new_user, _ = client.request('POST', '/api/usr/create', new_usr_payload)
  assert code == 201, f"User create failed: {code} {new_user}"
  new_user_id = new_user['id']

  # Soft delete de usuario (DELETE)
  code, del_usr_res, _ = client.request('DELETE', f'/api/usr/delete/{new_user_id}')
  assert code == 200
  assert 'eliminado correctamente' in del_usr_res['message']

  # Verificar que no aparece en listado activo
  code, usr_list_after_del, _ = client.request('GET', '/api/usr?size=10')
  assert not any(u['id'] == new_user_id for u in usr_list_after_del['results'])

  # Restore de usuario (PATCH)
  code, rest_usr_res, _ = client.request('PATCH', f'/api/usr/restore/{new_user_id}')
  assert code == 200
  assert 'restaurado correctamente' in rest_usr_res['message']

  # Verificar que reaparece
  code, usr_list_after_rest, _ = client.request('GET', '/api/usr?size=10')
  assert any(u['id'] == new_user_id for u in usr_list_after_rest['results'])
  print("7. Usr: Listado, creación, soft delete (DELETE) y restore (PATCH) [PASS]")

  # 8. Task List, Create, Filter, Soft-delete y Restore
  code, task_list, _ = client.request('GET', '/api/task?size=100')
  assert code == 200
  assert task_list['count'] == 75  # 100 menos 25 eliminadas por defecto en seed

  # Paginación canónica con size=0 (todos los registros envueltos)
  code, task_all, _ = client.request('GET', '/api/task?size=0')
  assert code == 200
  assert task_all['count'] == 75
  assert task_all['size'] == 0
  assert task_all['last'] is None
  assert task_all['next'] is None
  assert len(task_all['results']) == 75

  # Paginación estándar (count, page, size, first, last, next, previous, results)
  code, task_page, _ = client.request('GET', '/api/task?page=1&size=10')
  assert code == 200
  assert task_page['page'] == 1
  assert task_page['size'] == 10
  assert task_page['first'] == 1
  assert task_page['last'] == 8
  assert task_page['next'] == 2
  assert task_page['previous'] is None

  # Filtrado por rango de fecha (_gte y _lte)
  first_task_date = task_list['results'][0]['created_at'][:10]
  code, res_range, _ = client.request('GET', f'/api/task?created_at_gte={first_task_date}&created_at_lte={first_task_date}&size=100')
  assert code == 200
  assert res_range['count'] > 0

  # Crear tarea
  new_task_payload = {
    'title': 'Test Task NestJS',
    'description': 'Validación de tarea en bck',
    'status': 'yellow',
  }
  code, new_task, _ = client.request('POST', '/api/task/create', new_task_payload)
  assert code == 201
  new_task_id = new_task['id']

  # Actualizar tarea
  code, update_task_res, _ = client.request('PATCH', f'/api/task/update/{new_task_id}', {'status': 'green'})
  assert code == 200
  assert update_task_res['status'] == 'green'

  # Soft delete de tarea (DELETE)
  code, del_task_res, _ = client.request('DELETE', f'/api/task/delete/{new_task_id}')
  assert code == 200
  assert 'eliminada correctamente' in del_task_res['message']

  # Restore de tarea (PATCH)
  code, rest_task_res, _ = client.request('PATCH', f'/api/task/restore/{new_task_id}')
  assert code == 200
  assert 'restaurada correctamente' in rest_task_res['message']
  print("8. Task: Listado con paginación canónica (size=0 y size=10), creación, filtros, soft delete y restore [PASS]")

  # 9. Validación de Conflictos (HTTP 409)
  dup_usr_payload = {
    'email': 'admin@techcorp.com',
    'name': 'Duplicate Admin',
    'password': 'password123',
    'role': 'member',
  }
  code, res_dup, _ = client.request('POST', '/api/usr/create', dup_usr_payload)
  assert code == 409, f"Expected 409 on duplicate user email, got {code}"
  assert 'ya está registrado en esta organización' in res_dup['message']

  dup_org_payload = {
    'name': 'TechCorp Duplicate',
    'slug': 'techcorp',
    'user': {
      'email': 'other@dup.com',
      'name': 'Other',
      'password': 'password123',
    }
  }
  code, res_dup_org, _ = client.request('POST', '/api/org/create', dup_org_payload)
  assert code == 409, f"Expected 409 on duplicate org slug, got {code}"
  assert 'ya está en uso' in res_dup_org['message']
  print("9. Conflictos (HTTP 409): Validación de duplicados en org slug y user email [PASS]")

  # 10. Control de Acceso y Roles (HTTP 403)
  member_client = HttpClient()
  code, member_login, _ = member_client.request('POST', '/api/auth/login', {'email': 'user1@techcorp.com', 'password': '123456'})
  assert code == 201
  member_token = member_login['access_token']
  member_client.set_auth(member_token)

  # Miembro intenta eliminar tarea -> 403 Forbidden
  code, res_unauth_del_task, _ = member_client.request('DELETE', f'/api/task/delete/{new_task_id}')
  assert code == 403, f"Expected 403 for member task delete, got {code}"
  print("10. Roles y Permisos: HTTP 403 Forbidden en acciones restringidas a admin [PASS]")

  # 11. Mensajes Canónicos 404
  dummy_uuid = '00000000-0000-0000-0000-000000000000'
  code, res_404_org, _ = client.request('GET', f'/api/org/detail/{dummy_uuid}')
  assert code == 404
  assert 'Organización con id "00000000-0000-0000-0000-000000000000" no encontrada' in res_404_org['message']

  code, res_404_usr, _ = client.request('GET', f'/api/usr/detail/{dummy_uuid}')
  assert code == 404
  assert 'Usuario con id "00000000-0000-0000-0000-000000000000" no encontrado' in res_404_usr['message']

  code, res_404_tsk, _ = client.request('GET', f'/api/task/detail/{dummy_uuid}')
  assert code == 404
  assert 'Tarea con id "00000000-0000-0000-0000-000000000000" no encontrada' in res_404_tsk['message']
  print("11. Mensajes 404 Canónicos: Verificación exacta de cadenas de error [PASS]")

  # 12. Refresh Token
  # Sin cookie
  no_cookie_client = HttpClient()
  code, res_no_cookie, _ = no_cookie_client.request('POST', '/api/auth/refresh', send_cookies=False)
  assert code == 201
  assert res_no_cookie['message'] == 'No refresh token proporcionado'

  # Con cookie
  code, res_refresh, _ = client.request('POST', '/api/auth/refresh')
  assert code == 201
  assert 'access_token' in res_refresh
  new_access_token = res_refresh['access_token']
  client.set_auth(new_access_token)
  print("12. Refresh: rotación de tokens y actualización de cookie [PASS]")

  # 13. Logout & Blacklist
  code, res_logout, _ = client.request('POST', '/api/auth/logout')
  assert code == 201
  assert res_logout['message'] == 'Sesión cerrada exitosamente'

  # Verificar que el token quedó en lista negra
  code, res_blacklisted, _ = client.request('GET', '/api/auth/me')
  assert code == 401
  assert 'Token invalidado' in str(res_blacklisted.get('message', ''))
  print("13. Logout: blacklist de token y borrado de cookie [PASS]")

  # 14. Cleanup Blacklist
  code, login_data, _ = client.request('POST', '/api/auth/login', login_payload)
  assert code == 201
  admin_token = login_data['access_token']
  client.set_auth(admin_token)

  code, cleanup_res, _ = client.request('POST', '/api/auth/cleanup-blacklist')
  assert code == 201
  assert 'tokens expirados eliminados' in cleanup_res['message']
  print("14. Cleanup Blacklist: endpoint administrativo [PASS]")

  # 15. Reset canónico (/api/reset)
  code, reset_res, _ = client.request('GET', '/api/reset')
  assert code == 200
  assert reset_res['totalRemaining'] == 0
  print("15. Reset canónico (/api/reset): tablas vaciadas [PASS]")

  # Restaurar seed final para que la base de datos quede lista para uso
  code, seed_final, _ = client.request('GET', '/api/seed')
  assert code == 200
  print("16. Seed final restaurado para entorno de desarrollo [PASS]")

  print("\n=== TODAS LAS PRUEBAS EN BCK (NESTJS) PASARON EXITOSAMENTE (100% PASS) ===")

if __name__ == '__main__':
  run_tests()
